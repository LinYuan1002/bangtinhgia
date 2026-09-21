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
  finalPrice: number,
  input: CalculationInput,
  policy: PolicyVersion,
  loanAmount: number = 0
): PaymentScheduleEngineResult {
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'
  const unitType = normalizeUnitType(input.unit.unitType)
  const depositAmount = getDepositAmountForUnit(unitType)

  const earlyKeyEligible = Boolean(policy.earlyKeyEligible)
  let earlyKeyQualified = false

  const milestones: PaymentScheduleItemResult[] = []

  if (input.paymentOption === 'EARLY_PAYMENT') {
    const earlyPercent = input.earlyPaymentPercent || 95
    if (earlyKeyEligible && earlyPercent >= (policy.earlyKeyMinPaymentPercent || 70)) {
      earlyKeyQualified = true
    }

    // Đợt 1: Đặt cọc
    const depAmt = Math.min(depositAmount, finalPrice)
    const depPercent = (depAmt / finalPrice) * 100

    milestones.push({
      sequence: 1,
      label: 'Đợt 1: Đặt cọc',
      percentage: Number(depPercent.toFixed(2)),
      amount: depAmt,
      cumulativeAmount: depAmt,
      cumulativePercent: Number(depPercent.toFixed(2)),
      remainingAmount: finalPrice - depAmt,
      dueDateNote: 'Ngay khi ký Thỏa thuận đặt cọc (TTĐC)',
      isDeposit: true,
      notes: `Tiền đặt cọc chuẩn căn ${unitType}`,
    })

    // Đợt 2: Thanh toán sớm đến % yêu cầu (trừ cọc)
    const totalEarlyAmount = roundMoney(
      finalPrice * (earlyPercent / 100),
      roundingUnit,
      roundingMode
    )
    const step2Amount = Math.max(0, totalEarlyAmount - depAmt)
    const step2Percent = Number((earlyPercent - depPercent).toFixed(2))

    const deadlineNote = input.earlyPaymentDeadline
      ? `Đến ngày ${new Date(input.earlyPaymentDeadline).toLocaleDateString('vi-VN')}`
      : 'Theo hạn thanh toán sớm quy định'

    milestones.push({
      sequence: 2,
      label: `Đợt 2: Thanh toán sớm ${earlyPercent}% (đã trừ cọc)`,
      percentage: step2Percent,
      amount: step2Amount,
      cumulativeAmount: totalEarlyAmount,
      cumulativePercent: earlyPercent,
      remainingAmount: finalPrice - totalEarlyAmount,
      dueDateNote: deadlineNote,
      notes: earlyKeyQualified ? '★ Đủ điều kiện nhận quyền lợi Sun Early Key' : undefined,
    })

    // Các đợt còn lại (nếu chưa đủ 100%)
    if (earlyPercent < 100) {
      const remainingPercent = 100 - earlyPercent
      const remainingAmt = finalPrice - totalEarlyAmount

      if (remainingPercent <= 5) {
        // Đợt nhận sổ / Thông báo cấp GCN
        milestones.push({
          sequence: 3,
          label: 'Đợt 3: Thông báo cấp Giấy chứng nhận quyền sở hữu',
          percentage: remainingPercent,
          amount: remainingAmt,
          cumulativeAmount: finalPrice,
          cumulativePercent: 100,
          remainingAmount: 0,
          dueDateNote: 'Khi có thông báo bàn giao Giấy chứng nhận',
        })
      } else {
        // Đợt nhận nhà (ví dụ còn 25%) và đợt nhận sổ (5%)
        const handoverPercent = Math.max(0, remainingPercent - 5)
        const handoverAmt = roundMoney(
          finalPrice * (handoverPercent / 100),
          roundingUnit,
          roundingMode
        )
        const certAmt = remainingAmt - handoverAmt

        milestones.push({
          sequence: 3,
          label: 'Đợt 3: Nhận bàn giao căn hộ',
          percentage: handoverPercent,
          amount: handoverAmt,
          cumulativeAmount: totalEarlyAmount + handoverAmt,
          cumulativePercent: earlyPercent + handoverPercent,
          remainingAmount: certAmt,
          dueDateNote: 'Theo thông báo bàn giao căn hộ từ CĐT',
        })

        milestones.push({
          sequence: 4,
          label: 'Đợt 4: Thông báo cấp Giấy chứng nhận',
          percentage: 5,
          amount: certAmt,
          cumulativeAmount: finalPrice,
          cumulativePercent: 100,
          remainingAmount: 0,
          dueDateNote: 'Khi có thông báo nhận GCN',
        })
      }
    }
  } else if (input.paymentOption === 'LOAN') {
    // Phương án VAY NGÂN HÀNG
    const equityTotal = Math.max(0, finalPrice - loanAmount)
    const depAmt = Math.min(depositAmount, equityTotal)
    const depPercent = Number(((depAmt / finalPrice) * 100).toFixed(2))

    // Đợt 1: Đặt cọc
    milestones.push({
      sequence: 1,
      label: 'Đợt 1: Đặt cọc',
      percentage: depPercent,
      amount: depAmt,
      cumulativeAmount: depAmt,
      cumulativePercent: depPercent,
      remainingAmount: finalPrice - depAmt,
      dueDateNote: 'Ngay khi ký TTĐC',
      isDeposit: true,
      notes: `Vốn tự có khách hàng - Đặt cọc căn ${unitType}`,
    })

    // Đợt 2: Vốn tự có còn lại (đến khoảng 30% HĐ)
    const remainingEquity = Math.max(0, equityTotal - depAmt)
    const equityTotalPercent = Number(((equityTotal / finalPrice) * 100).toFixed(2))
    const step2Percent = Number((equityTotalPercent - depPercent).toFixed(2))

    milestones.push({
      sequence: 2,
      label: 'Đợt 2: Hoàn tất vốn tự có (Ký HĐMB)',
      percentage: step2Percent,
      amount: remainingEquity,
      cumulativeAmount: equityTotal,
      cumulativePercent: equityTotalPercent,
      remainingAmount: loanAmount,
      dueDateNote: 'Trong vòng 15-30 ngày kể từ ngày ký TTĐC',
      notes: 'Khách hàng thanh toán đủ phần vốn tự có',
    })

    // Đợt 3: Ngân hàng giải ngân
    const loanPercent = Number(((loanAmount / finalPrice) * 100).toFixed(2))
    milestones.push({
      sequence: 3,
      label: `Đợt 3: Ngân hàng giải ngân gói HTLS (${policy.loanRules.supportPeriodMonths} tháng 0%)`,
      percentage: loanPercent,
      amount: loanAmount,
      cumulativeAmount: finalPrice,
      cumulativePercent: 100,
      remainingAmount: 0,
      dueDateNote: 'Theo thông báo giải ngân của ngân hàng & CĐT',
      notes: `Lãi suất 0% và ân hạn nợ gốc trong ${policy.loanRules.supportPeriodMonths} tháng`,
    })
  } else {
    // TIẾN ĐỘ CHUẨN (NO_LOAN hoặc STANDARD)
    const templates = policy.paymentMilestones && policy.paymentMilestones.length > 0
      ? policy.paymentMilestones
      : getDefaultMilestones()

    let cumulative = 0
    let cumulativePct = 0

    templates.forEach((tpl, idx) => {
      let stepAmount = 0
      let stepPct = tpl.percentage

      if (idx === 0) {
        // Đặt cọc
        stepAmount = Math.min(depositAmount, finalPrice)
        stepPct = Number(((stepAmount / finalPrice) * 100).toFixed(2))
      } else if (tpl.deductDeposit) {
        // Đợt ký HĐMB khấu trừ cọc
        const fullStepAmt = roundMoney(
          finalPrice * (tpl.percentage / 100),
          roundingUnit,
          roundingMode
        )
        stepAmount = Math.max(0, fullStepAmt - depositAmount)
      } else {
        stepAmount = roundMoney(
          finalPrice * (tpl.percentage / 100),
          roundingUnit,
          roundingMode
        )
      }

      cumulative += stepAmount
      cumulativePct = Number((cumulativePct + stepPct).toFixed(2))

      milestones.push({
        sequence: idx + 1,
        label: tpl.label,
        percentage: stepPct,
        amount: stepAmount,
        cumulativeAmount: cumulative,
        cumulativePercent: Math.min(100, cumulativePct),
        remainingAmount: Math.max(0, finalPrice - cumulative),
        dueDateNote: tpl.dueDateRule,
        isDeposit: tpl.isDeposit,
        notes: tpl.notes,
      })
    })

    // Điều chỉnh làm tròn đợt cuối để tổng lũy kế khớp 100% finalPrice
    if (milestones.length > 0) {
      const last = milestones[milestones.length - 1]
      const totalAccum = milestones.reduce((sum, m) => sum + m.amount, 0)
      const diff = finalPrice - totalAccum
      if (diff !== 0) {
        last.amount += diff
        last.cumulativeAmount = finalPrice
        last.remainingAmount = 0
      }
    }
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
