// ─────────────────────────────────────────────────────────────
// PAYMENT SCHEDULE ENGINE (BẢNG TIẾN ĐỘ THANH TOÁN)
// Dynamic milestone generation according to unit type deposit,
// payment option (No Loan, Early Payment, Loan), and policy templates.
// ─────────────────────────────────────────────────────────────

import {
  CalculationInput,
  PolicyVersion,
  UnitType,
  PaymentScheduleItemResult,
  PaymentMilestoneTemplate,
} from './types'
import { roundMoney } from './rounding'
import { normalizeUnitType } from './validators'

/**
 * Default deposit amounts by Unit Type for Sun Urban City
 */
export const DEFAULT_DEPOSITS_BY_UNIT_TYPE: Record<UnitType, number> = {
  STUDIO: 50_000_000,
  '1BR_PLUS': 100_000_000,
  '2BR': 150_000_000,
  '3BR': 200_000_000,
}

export function getDepositAmountForUnit(unitType: UnitType | string): number {
  const norm = normalizeUnitType(unitType)
  return DEFAULT_DEPOSITS_BY_UNIT_TYPE[norm] || 100_000_000
}

export interface PaymentScheduleEngineResult {
  depositAmount: number
  earlyKeyEligible: boolean
  earlyKeyQualified: boolean
  milestones: PaymentScheduleItemResult[]
}

export function generatePaymentSchedule(
  finalPriceInput: number,
  input: CalculationInput,
  policy: PolicyVersion,
  loanAmount: number = 0,
  netPriceOverride?: number
): PaymentScheduleEngineResult {
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'
  const unitType = normalizeUnitType(input.unit.unitType)
  const depositAmount = getDepositAmountForUnit(unitType)

  const earlyKeyEligible = Boolean(policy.earlyKeyEligible)
  let earlyKeyQualified = false

  // Base pricing components:
  // finalPriceInput is the total gross payment (including VAT & KPBT, factor 1.12)
  const finalGross = Math.round(finalPriceInput)
  const pNet = netPriceOverride || roundMoney(finalGross / 1.12, roundingUnit, roundingMode)
  const pVat = roundMoney(pNet * 1.10, roundingUnit, roundingMode) // Giá tính HĐMB gồm VAT

  const milestones: PaymentScheduleItemResult[] = []

  if (input.paymentOption === 'EARLY_PAYMENT') {
    const earlyPercent = input.earlyPaymentPercent || 95
    if (earlyKeyEligible && earlyPercent >= (policy.earlyKeyMinPaymentPercent || 70)) {
      earlyKeyQualified = true
    }

    // Đợt 1: Đặt cọc
    const depAmt = Math.min(depositAmount, finalGross)
    const depPercent = Number(((depAmt / finalGross) * 100).toFixed(2))

    milestones.push({
      sequence: 1,
      label: 'Đợt 1: Ký TTĐC / Đặt cọc',
      percentage: depPercent,
      amount: depAmt,
      cumulativeAmount: depAmt,
      cumulativePercent: depPercent,
      remainingAmount: finalGross - depAmt,
      dueDateNote: 'Ngay khi ký Thỏa thuận đặt cọc (TTĐC)',
      isDeposit: true,
      notes: `Mức cọc chuẩn cho căn ${unitType}`,
    })

    // Đợt 2: Thanh toán sớm đến % yêu cầu của Giá HĐMB (trừ cọc)
    const earlyVatAmt = roundMoney(pVat * (earlyPercent / 100), roundingUnit, roundingMode)
    const step2Amount = Math.max(0, earlyVatAmt - depAmt)
    const step2Pct = Number(((step2Amount / finalGross) * 100).toFixed(2))
    const cum2Amt = depAmt + step2Amount
    const cum2Pct = Number(((cum2Amt / finalGross) * 100).toFixed(2))

    const deadlineNote = input.earlyPaymentDeadline
      ? `Đến ngày ${new Date(input.earlyPaymentDeadline).toLocaleDateString('vi-VN')}`
      : 'Theo hạn thanh toán sớm quy định'

    milestones.push({
      sequence: 2,
      label: `Đợt 2: Thanh toán sớm ${earlyPercent}% Giá HĐMB (đã trừ cọc)`,
      percentage: step2Pct,
      amount: step2Amount,
      cumulativeAmount: cum2Amt,
      cumulativePercent: cum2Pct,
      remainingAmount: finalGross - cum2Amt,
      dueDateNote: deadlineNote,
      notes: earlyKeyQualified ? '★ Đủ điều kiện nhận quyền lợi Sun Early Key (TT >= 70%)' : undefined,
    })

    if (earlyPercent === 95) {
      // Đợt 3a: 100% KPBT + Thuế VAT của 5% (2.5% của Giá chưa VAT)
      const step3aAmt = roundMoney(pNet * 0.025, roundingUnit, roundingMode)
      const step3aPct = Number(((step3aAmt / finalGross) * 100).toFixed(2))
      const cum3aAmt = cum2Amt + step3aAmt

      milestones.push({
        sequence: 3,
        label: 'Đợt 3a: 100% KPBT + Thuế VAT của 5%',
        percentage: step3aPct,
        amount: step3aAmt,
        cumulativeAmount: cum3aAmt,
        cumulativePercent: Number(((cum3aAmt / finalGross) * 100).toFixed(2)),
        remainingAmount: finalGross - cum3aAmt,
        dueDateNote: 'Khi có thông báo bàn giao căn hộ từ CĐT',
        notes: '2% KPBT + 10% VAT của đợt cuối 5%',
      })

      // Đợt 3b: 5% Giá trị căn hộ (Trả lãi TTS từ ngày bàn giao đến khi nhận GCN)
      const step3bAmt = finalGross - cum3aAmt
      const step3bPct = Number(((step3bAmt / finalGross) * 100).toFixed(2))

      milestones.push({
        sequence: 4,
        label: 'Đợt 3b: 5% Giá trị căn hộ (Trả lãi TTS đến khi nhận GCN)',
        percentage: step3bPct,
        amount: step3bAmt,
        cumulativeAmount: finalGross,
        cumulativePercent: 100,
        remainingAmount: 0,
        dueDateNote: 'Khi nhận thông báo bàn giao Giấy chứng nhận',
        notes: '5% Giá trị căn hộ chưa VAT',
      })
    } else if (earlyPercent === 70) {
      // 5 đợt tiếp theo, mỗi đợt 5% Giá HĐMB
      let currCum = cum2Amt
      let seq = 3
      for (let i = 1; i <= 5; i++) {
        const amt = roundMoney(pVat * 0.05, roundingUnit, roundingMode)
        currCum += amt
        milestones.push({
          sequence: seq++,
          label: `Đợt ${seq - 1}: Thanh toán định kỳ 5% Giá HĐMB`,
          percentage: Number(((amt / finalGross) * 100).toFixed(2)),
          amount: amt,
          cumulativeAmount: currCum,
          cumulativePercent: Number(((currCum / finalGross) * 100).toFixed(2)),
          remainingAmount: finalGross - currCum,
          dueDateNote: `Định kỳ 2 tháng/lần (Đợt ${i} sau TTS 70%)`,
        })
      }

      // Đợt bàn giao tách 2 dòng
      const step8aAmt = roundMoney(pNet * 0.025, roundingUnit, roundingMode)
      currCum += step8aAmt
      milestones.push({
        sequence: seq++,
        label: 'Đợt 8a: 100% KPBT + Thuế VAT của 5%',
        percentage: Number(((step8aAmt / finalGross) * 100).toFixed(2)),
        amount: step8aAmt,
        cumulativeAmount: currCum,
        cumulativePercent: Number(((currCum / finalGross) * 100).toFixed(2)),
        remainingAmount: finalGross - currCum,
        dueDateNote: 'Khi có thông báo bàn giao căn hộ từ CĐT',
        notes: '2% KPBT + 10% VAT của đợt cuối 5%',
      })

      const step8bAmt = finalGross - currCum
      milestones.push({
        sequence: seq++,
        label: 'Đợt 8b: 5% Giá trị căn hộ (Trả lãi TTS đến khi nhận GCN)',
        percentage: Number(((step8bAmt / finalGross) * 100).toFixed(2)),
        amount: step8bAmt,
        cumulativeAmount: finalGross,
        cumulativePercent: 100,
        remainingAmount: 0,
        dueDateNote: 'Khi nhận thông báo bàn giao GCN',
      })
    } else {
      // Gói 50% hoặc khác: Đợt 3a & 3b ở cuối
      const stepRemAmt = roundMoney(pVat * ((95 - earlyPercent) / 100), roundingUnit, roundingMode)
      const cumMidAmt = cum2Amt + stepRemAmt
      milestones.push({
        sequence: 3,
        label: `Đợt 3: Thanh toán theo tiến độ còn lại (${95 - earlyPercent}% Giá HĐMB)`,
        percentage: Number(((stepRemAmt / finalGross) * 100).toFixed(2)),
        amount: stepRemAmt,
        cumulativeAmount: cumMidAmt,
        cumulativePercent: Number(((cumMidAmt / finalGross) * 100).toFixed(2)),
        remainingAmount: finalGross - cumMidAmt,
        dueDateNote: 'Theo tiến độ định kỳ quy định',
      })

      const step4aAmt = roundMoney(pNet * 0.025, roundingUnit, roundingMode)
      const cum4aAmt = cumMidAmt + step4aAmt
      milestones.push({
        sequence: 4,
        label: 'Đợt 4a: 100% KPBT + Thuế VAT của 5%',
        percentage: Number(((step4aAmt / finalGross) * 100).toFixed(2)),
        amount: step4aAmt,
        cumulativeAmount: cum4aAmt,
        cumulativePercent: Number(((cum4aAmt / finalGross) * 100).toFixed(2)),
        remainingAmount: finalGross - cum4aAmt,
        dueDateNote: 'Khi nhận bàn giao căn hộ',
      })

      const step4bAmt = finalGross - cum4aAmt
      milestones.push({
        sequence: 5,
        label: 'Đợt 4b: 5% Giá trị căn hộ (Trả lãi TTS đến khi nhận GCN)',
        percentage: Number(((step4bAmt / finalGross) * 100).toFixed(2)),
        amount: step4bAmt,
        cumulativeAmount: finalGross,
        cumulativePercent: 100,
        remainingAmount: 0,
        dueDateNote: 'Khi nhận thông báo bàn giao GCN',
      })
    }
  } else if (input.paymentOption === 'LOAN') {
    // ── PHƯƠNG ÁN VAY NGÂN HÀNG 70% (HTLS 0%) ──
    const depAmt = Math.min(depositAmount, finalGross)
    const depPct = Number(((depAmt / finalGross) * 100).toFixed(2))

    // Đợt 1: Đặt cọc
    milestones.push({
      sequence: 1,
      label: 'Đợt 1: Ký TTĐC / Đặt cọc',
      percentage: depPct,
      amount: depAmt,
      cumulativeAmount: depAmt,
      cumulativePercent: depPct,
      remainingAmount: finalGross - depAmt,
      dueDateNote: 'Ngay khi ký TTĐC',
      isDeposit: true,
      notes: `Vốn tự có - Đặt cọc căn ${unitType}`,
    })

    // Đợt 2: Ký HĐMB - Đóng đủ 15% Giá HĐMB trừ cọc
    const equity15 = roundMoney(pVat * 0.15, roundingUnit, roundingMode)
    const step2Amt = Math.max(0, equity15 - depAmt)
    const cum2Amt = depAmt + step2Amt
    milestones.push({
      sequence: 2,
      label: 'Đợt 2: Ký HĐMB - Đóng đủ 15% Giá HĐMB (đã trừ cọc)',
      percentage: Number(((step2Amt / finalGross) * 100).toFixed(2)),
      amount: step2Amt,
      cumulativeAmount: cum2Amt,
      cumulativePercent: Number(((cum2Amt / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - cum2Amt,
      dueDateNote: 'Trong vòng 15 ngày kể từ ngày ký TTĐC (Dự kiến 25/08/2026)',
      notes: 'Khách hàng đóng đủ 15% vốn tự có đợt đầu',
    })

    // Đợt 3: Ngân hàng giải ngân 70% Giá HĐMB
    const loanDisbursed = roundMoney(pVat * 0.70, roundingUnit, roundingMode)
    const cum3Amt = cum2Amt + loanDisbursed
    milestones.push({
      sequence: 3,
      label: `Đợt 3: Ngân hàng giải ngân gói HTLS 70% (${policy.loanRules.supportPeriodMonths} tháng 0%)`,
      percentage: Number(((loanDisbursed / finalGross) * 100).toFixed(2)),
      amount: loanDisbursed,
      cumulativeAmount: cum3Amt,
      cumulativePercent: Number(((cum3Amt / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - cum3Amt,
      dueDateNote: 'Trong vòng 15 ngày sau khi ký HĐMB',
      notes: `Lãi suất 0%, ân hạn nợ gốc và miễn phí trả nợ trước hạn trong ${policy.loanRules.supportPeriodMonths} tháng`,
    })

    // Đợt 4: Vốn tự có 10% Giá HĐMB
    const equity10 = roundMoney(pVat * 0.10, roundingUnit, roundingMode)
    const cum4Amt = cum3Amt + equity10
    milestones.push({
      sequence: 4,
      label: 'Đợt 4: Vốn tự có 10% Giá HĐMB',
      percentage: Number(((equity10 / finalGross) * 100).toFixed(2)),
      amount: equity10,
      cumulativeAmount: cum4Amt,
      cumulativePercent: Number(((cum4Amt / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - cum4Amt,
      dueDateNote: 'Sau 60 ngày kể từ ngày ký HĐMB (Dự kiến 25/10/2026)',
      notes: 'Khách hàng thanh toán nốt phần vốn tự có',
    })

    // Đợt 5a: 100% KPBT + Thuế VAT của 5% (2.5% Giá chưa VAT)
    const step5aAmt = roundMoney(pNet * 0.025, roundingUnit, roundingMode)
    const cum5aAmt = cum4Amt + step5aAmt
    milestones.push({
      sequence: 5,
      label: 'Đợt 5a: 100% KPBT + Thuế VAT của 5%',
      percentage: Number(((step5aAmt / finalGross) * 100).toFixed(2)),
      amount: step5aAmt,
      cumulativeAmount: cum5aAmt,
      cumulativePercent: Number(((cum5aAmt / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - cum5aAmt,
      dueDateNote: 'Theo thông báo nhận bàn giao căn hộ (Dự kiến 30/09/2027)',
      notes: '2% KPBT + 10% VAT của đợt 5%',
    })

    // Đợt 5b: 5% Giá trị căn hộ (Trả lãi TTS từ ngày bàn giao đến khi nhận GCN)
    const step5bAmt = finalGross - cum5aAmt
    milestones.push({
      sequence: 6,
      label: 'Đợt 5b: 5% Giá trị căn hộ (Trả lãi TTS đến khi nhận GCN)',
      percentage: Number(((step5bAmt / finalGross) * 100).toFixed(2)),
      amount: step5bAmt,
      cumulativeAmount: finalGross,
      cumulativePercent: 100,
      remainingAmount: 0,
      dueDateNote: 'Khi có thông báo nhận Giấy chứng nhận quyền sở hữu',
      notes: '5% Giá trị căn hộ chưa VAT',
    })
  } else {
    // ── TIẾN ĐỘ CHUẨN (NO_LOAN hoặc STANDARD) ──
    const depAmt = Math.min(depositAmount, finalGross)
    milestones.push({
      sequence: 1,
      label: 'Đợt 1: Ký TTĐC / Đặt cọc',
      percentage: Number(((depAmt / finalGross) * 100).toFixed(2)),
      amount: depAmt,
      cumulativeAmount: depAmt,
      cumulativePercent: Number(((depAmt / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - depAmt,
      dueDateNote: 'Ngay khi ký TTĐC',
      isDeposit: true,
      notes: `Tiền cọc căn ${unitType}`,
    })

    // Đợt 2: Ký HĐMB 15% trừ cọc
    const step2Full = roundMoney(pVat * 0.15, roundingUnit, roundingMode)
    const step2Amt = Math.max(0, step2Full - depAmt)
    let currCum = depAmt + step2Amt
    milestones.push({
      sequence: 2,
      label: 'Đợt 2: Ký HĐMB - Đóng đủ 15% Giá HĐMB (đã trừ cọc)',
      percentage: Number(((step2Amt / finalGross) * 100).toFixed(2)),
      amount: step2Amt,
      cumulativeAmount: currCum,
      cumulativePercent: Number(((currCum / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - currCum,
      dueDateNote: 'Dự kiến 25/08/2026',
    })

    // Các đợt theo tiến độ chuẩn giãn đều 5% hoặc 10% đến 95% Giá HĐMB (80% còn lại)
    // Tách thành các đợt định kỳ 2 tháng/lần
    const regularSteps = [
      { label: 'Đợt 3: Thanh toán 10% Giá HĐMB', pct: 0.10, due: '25/10/2026' },
      { label: 'Đợt 4: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/12/2026' },
      { label: 'Đợt 5: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/02/2027' },
      { label: 'Đợt 6: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/04/2027' },
      { label: 'Đợt 7: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/06/2027' },
      { label: 'Đợt 8: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/08/2027' },
      { label: 'Đợt 9: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/10/2027' },
      { label: 'Đợt 10: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/12/2027' },
      { label: 'Đợt 11: Thanh toán 10% Giá HĐMB', pct: 0.10, due: '25/02/2028' },
      { label: 'Đợt 12: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/04/2028' },
      { label: 'Đợt 13: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/06/2028' },
      { label: 'Đợt 14: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/08/2028' },
      { label: 'Đợt 15: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/10/2028' },
      { label: 'Đợt 16: Thanh toán 5% Giá HĐMB', pct: 0.05, due: '25/12/2028' },
    ]

    let seq = 3
    for (const step of regularSteps) {
      const amt = roundMoney(pVat * step.pct, roundingUnit, roundingMode)
      currCum += amt
      milestones.push({
        sequence: seq++,
        label: step.label,
        percentage: Number(((amt / finalGross) * 100).toFixed(2)),
        amount: amt,
        cumulativeAmount: currCum,
        cumulativePercent: Number(((currCum / finalGross) * 100).toFixed(2)),
        remainingAmount: finalGross - currCum,
        dueDateNote: step.due,
      })
    }

    // Đợt bàn giao tách 2 dòng:
    const stepHandoverAmt = roundMoney(pNet * 0.025, roundingUnit, roundingMode)
    currCum += stepHandoverAmt
    milestones.push({
      sequence: seq++,
      label: 'Đợt 17a: 100% KPBT + Thuế VAT của 5%',
      percentage: Number(((stepHandoverAmt / finalGross) * 100).toFixed(2)),
      amount: stepHandoverAmt,
      cumulativeAmount: currCum,
      cumulativePercent: Number(((currCum / finalGross) * 100).toFixed(2)),
      remainingAmount: finalGross - currCum,
      dueDateNote: 'Dự kiến 30/09/2028 (Bàn giao căn hộ)',
      notes: '2% KPBT + 10% VAT của đợt cuối 5%',
    })

    const stepCertAmt = finalGross - currCum
    milestones.push({
      sequence: seq++,
      label: 'Đợt 17b: 5% Giá trị căn hộ (Trả lãi TTS đến khi nhận GCN)',
      percentage: Number(((stepCertAmt / finalGross) * 100).toFixed(2)),
      amount: stepCertAmt,
      cumulativeAmount: finalGross,
      cumulativePercent: 100,
      remainingAmount: 0,
      dueDateNote: 'Khi có thông báo nhận GCN quyền sở hữu',
    })
  }

  return {
    depositAmount,
    earlyKeyEligible,
    earlyKeyQualified,
    milestones,
  }
}

/**
 * Default standard milestones if policy has empty list
 */
function getDefaultMilestones(): PaymentMilestoneTemplate[] {
  return [
    {
      sequence: 1,
      label: 'Đợt 1: Đặt cọc',
      dueDateRule: 'Ngay khi ký TTĐC',
      percentage: 5,
      isDeposit: true,
      notes: 'Ký Thỏa thuận đặt cọc',
    },
    {
      sequence: 2,
      label: 'Đợt 2: Ký Hợp đồng mua bán (HĐMB)',
      dueDateRule: 'Trong vòng 15 ngày kể từ ngày ký TTĐC',
      percentage: 15,
      deductDeposit: true,
      notes: 'Thanh toán 15% gồm VAT (đã khấu trừ tiền đặt cọc Đợt 1)',
    },
    {
      sequence: 3,
      label: 'Đợt 3: Tiến độ xây dựng',
      dueDateRule: 'Sau 60 ngày kể từ Đợt 2',
      percentage: 15,
    },
    {
      sequence: 4,
      label: 'Đợt 4: Tiến độ xây dựng',
      dueDateRule: 'Sau 60 ngày kể từ Đợt 3',
      percentage: 15,
    },
    {
      sequence: 5,
      label: 'Đợt 5: Tiến độ xây dựng',
      dueDateRule: 'Sau 60 ngày kể từ Đợt 4',
      percentage: 20,
    },
    {
      sequence: 6,
      label: 'Đợt 6: Bàn giao căn hộ',
      dueDateRule: 'Theo thông báo bàn giao từ CĐT',
      percentage: 25,
      kpbtIncluded: true,
      notes: 'Thanh toán 25% + 2% Kinh phí bảo trì (nếu có)',
    },
    {
      sequence: 7,
      label: 'Đợt 7: Cấp Giấy chứng nhận quyền sở hữu',
      dueDateRule: 'Khi nhận thông báo bàn giao GCN',
      percentage: 5,
      notes: 'Thanh toán 5% cuối cùng nhận sổ hồng',
    },
  ]
}
