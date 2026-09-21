// ─────────────────────────────────────────────────────────────
// CALCULATION ENGINE (BỘ MÁY TÍNH GIÁ TRUNG TÂM)
// Hierarchy: PROJECT → POLICY VERSION → BUILDING → UNIT TYPE → UNIT →
// PRICE CONFIG → DISCOUNT CONFIG → PAYMENT PLAN → CALCULATION RESULT
// ─────────────────────────────────────────────────────────────

import {
  CalculationInput,
  CalculationResult,
  BreakdownItem,
  PolicyVersion,
} from './types'
import { roundMoney, formatVNDExact } from './rounding'
import { validateCalculationInput, normalizeUnitType } from './validators'
import { resolveActivePolicy } from './policy-engine'
import { calculateRawPrice } from './price-engine'
import { calculateCompletionValue } from './completion-engine'
import { calculateDiscounts } from './discount-engine'
import { calculateLoanDetails } from './loan-engine'
import { generatePaymentSchedule } from './payment-engine'

/**
 * Main calculation entrypoint.
 * Assembles all independent engines and generates full snapshot breakdown.
 */
export function calculateQuote(
  input: CalculationInput,
  policyOverride?: PolicyVersion
): CalculationResult {
  // 1. Resolve active policy for the unit's building
  const policy = policyOverride || input.policy || resolveActivePolicy(
    input.unit.building,
    input.calculationDate
  )

  // 2. Validate inputs
  const validation = validateCalculationInput(input, policy)
  if (!validation.isValid) {
    throw new Error(`Dữ liệu tính giá không hợp lệ: ${validation.errors.join('; ')}`)
  }

  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'
  const unitType = normalizeUnitType(input.unit.unitType)

  // 3. Raw apartment price calculation
  const rawPriceResult = calculateRawPrice(input.unit, policy)
  const { rawPriceNet, rawPriceVAT, rawPriceGross } = rawPriceResult

  // 4. Completion value calculation (dynamic per policy VAT mode)
  const completionResult = calculateCompletionValue(input.unit, policy)
  const {
    completionNet,
    completionVAT,
    completionGross,
    ratePerM2: completionRate,
  } = completionResult

  // 5. Kinh phí bảo trì (KPBT 2%)
  let kpbt = 0
  if (policy.kpbtType === 'PERCENTAGE' && policy.kpbtRate) {
    // 2% tính trên giá căn hộ thô chưa VAT (hoặc giá thô)
    kpbt = roundMoney(rawPriceNet * policy.kpbtRate, roundingUnit, roundingMode)
  } else if (policy.kpbtType === 'FIXED' && policy.kpbtValue) {
    kpbt = policy.kpbtValue
  }

  // 6. Subtotal gross before discounts
  const subtotalGross = rawPriceGross + completionGross

  // 7. Discounts & benefits calculation (calculated strictly on rawPriceNet)
  const discountResult = calculateDiscounts(rawPriceNet, input, policy)
  const {
    noLoanDiscount,
    earlyPaymentDiscount,
    otherDiscounts,
    totalDiscount,
    earlyPaymentInterest,
    earlyDays,
  } = discountResult

  // 8. Final price (Tổng giá trị HĐ gồm VAT & Hoàn thiện sau chiết khấu)
  const finalPrice = Math.max(0, subtotalGross - totalDiscount)

  // 9. Loan & Equity details
  const loanResult = calculateLoanDetails(rawPriceGross, finalPrice, input, policy)
  const { loanAmount, equityAmount, loanBasis } = loanResult

  // 10. Payment schedule generation (with deposit deduction)
  const scheduleResult = generatePaymentSchedule(
    finalPrice,
    input,
    policy,
    loanAmount
  )
  const { earlyKeyEligible, earlyKeyQualified, milestones: paymentSchedule } = scheduleResult

  // 11. Total benefits (Chiết khấu + Lãi suất thanh toán sớm)
  const totalBenefits = totalDiscount + earlyPaymentInterest

  // 12. Build full calculation breakdown (15+ transparent items with formulas & tooltips)
  const calculationBreakdown: BreakdownItem[] = [
    {
      key: 'rawPriceNet',
      label: '1. Giá căn hộ thô (chưa VAT)',
      amount: rawPriceNet,
      formattedAmount: formatVNDExact(rawPriceNet),
      formulaExplanation: policy.rawPriceIncludesVAT
        ? `Giá niêm yết (${formatVNDExact(input.unit.basePrice)}) / (1 + ${(policy.vatRate * 100)}% VAT)`
        : `Giá niêm yết gốc chưa thuế`,
      category: 'RAW_PRICE',
    },
    {
      key: 'rawPriceVAT',
      label: `2. Thuế VAT căn hộ thô (${policy.vatRate * 100}%)`,
      amount: rawPriceVAT,
      formattedAmount: formatVNDExact(rawPriceVAT),
      formulaExplanation: `Giá thô chưa VAT x ${(policy.vatRate * 100)}%`,
      category: 'RAW_PRICE',
    },
    {
      key: 'rawPriceGross',
      label: '3. Giá căn hộ thô (đã gồm VAT)',
      amount: rawPriceGross,
      formattedAmount: formatVNDExact(rawPriceGross),
      formulaExplanation: `Giá thô chưa VAT + Thuế VAT căn thô`,
      category: 'RAW_PRICE',
    },
    {
      key: 'completionRate',
      label: '4. Đơn giá hoàn thiện',
      amount: completionRate,
      formattedAmount: `${formatVNDExact(completionRate)} / m²`,
      formulaExplanation: policy.completionPriceIncludesVAT
        ? `Đơn giá hoàn thiện loại căn ${unitType} (Đã gồm 10% VAT theo ${policy.policyCode})`
        : `Đơn giá hoàn thiện loại căn ${unitType} (Chưa gồm VAT theo ${policy.policyCode})`,
      category: 'COMPLETION',
    },
    {
      key: 'completionNet',
      label: '5. Giá trị hoàn thiện (chưa VAT)',
      amount: completionNet,
      formattedAmount: formatVNDExact(completionNet),
      formulaExplanation: policy.completionPriceIncludesVAT
        ? `Giá trị hoàn thiện gồm VAT / (1 + 10% VAT)`
        : `Diện tích thông thủy (${input.unit.netArea} m²) x Đơn giá (${formatVNDExact(completionRate)})`,
      category: 'COMPLETION',
    },
    {
      key: 'completionVAT',
      label: '6. Thuế VAT hoàn thiện (10%)',
      amount: completionVAT,
      formattedAmount: formatVNDExact(completionVAT),
      formulaExplanation: `Giá trị hoàn thiện gồm VAT - Giá trị hoàn thiện chưa VAT`,
      category: 'COMPLETION',
    },
    {
      key: 'completionGross',
      label: '7. Giá trị hoàn thiện (đã gồm VAT)',
      amount: completionGross,
      formattedAmount: formatVNDExact(completionGross),
      formulaExplanation: policy.completionPriceIncludesVAT
        ? `Diện tích thông thủy (${input.unit.netArea} m²) x Đơn giá đã gồm VAT (${formatVNDExact(completionRate)})`
        : `Giá trị hoàn thiện chưa VAT + VAT hoàn thiện`,
      category: 'COMPLETION',
    },
    {
      key: 'kpbt',
      label: '8. Kinh phí bảo trì (KPBT 2%)',
      amount: kpbt,
      formattedAmount: formatVNDExact(kpbt),
      formulaExplanation: `2% tính trên giá căn hộ thô chưa VAT (Thu tại thời điểm bàn giao nhà, không trừ vào HĐMB)`,
      category: 'TAX_FEE',
    },
    {
      key: 'subtotalGross',
      label: '9. Tổng giá trị gồm VAT trước ưu đãi',
      amount: subtotalGross,
      formattedAmount: formatVNDExact(subtotalGross),
      formulaExplanation: `Giá căn thô gồm VAT (${formatVNDExact(rawPriceGross)}) + Hoàn thiện gồm VAT (${formatVNDExact(completionGross)})`,
      category: 'FINAL',
    },
    {
      key: 'noLoanDiscount',
      label: '10. Chiết khấu không vay ngân hàng',
      amount: noLoanDiscount,
      formattedAmount: formatVNDExact(noLoanDiscount),
      formulaExplanation: noLoanDiscount > 0
        ? `Giá thô chưa VAT (${formatVNDExact(rawPriceNet)}) x ${(discountResult.noLoanDiscountRate * 100).toFixed(1)}%`
        : `0 VNĐ (Chỉ áp dụng khi chọn Phương thức Tiến độ chuẩn / Không vay)`,
      category: 'DISCOUNT',
    },
    {
      key: 'earlyPaymentDiscount',
      label: '11. Chiết khấu thanh toán sớm',
      amount: earlyPaymentDiscount,
      formattedAmount: formatVNDExact(earlyPaymentDiscount),
      formulaExplanation: earlyPaymentDiscount > 0
        ? `Giá thô chưa VAT (${formatVNDExact(rawPriceNet)}) x ${(discountResult.earlyPaymentDiscountRate * 100).toFixed(1)}% (Mức đóng ${input.earlyPaymentPercent}%)`
        : `0 VNĐ (Áp dụng khi chọn Phương thức Thanh toán sớm)`,
      category: 'DISCOUNT',
    },
    {
      key: 'otherDiscounts',
      label: '12. Ưu đãi & Chiết khấu khác',
      amount: otherDiscounts,
      formattedAmount: formatVNDExact(otherDiscounts),
      formulaExplanation: `Tổng các chính sách ưu đãi bổ sung khác (nếu có)`,
      category: 'DISCOUNT',
    },
    {
      key: 'totalDiscount',
      label: '13. Tổng chiết khấu trừ vào giá',
      amount: totalDiscount,
      formattedAmount: formatVNDExact(totalDiscount),
      formulaExplanation: `CK không vay + CK thanh toán sớm + Ưu đãi khác (Tính nghiêm ngặt trên Giá thô chưa VAT)`,
      category: 'DISCOUNT',
    },
    {
      key: 'finalPrice',
      label: '14. Tổng giá trị Hợp đồng mua bán (gồm VAT & Hoàn thiện)',
      amount: finalPrice,
      formattedAmount: formatVNDExact(finalPrice),
      formulaExplanation: `Tổng trước ưu đãi (${formatVNDExact(subtotalGross)}) - Tổng chiết khấu (${formatVNDExact(totalDiscount)})`,
      category: 'FINAL',
    },
    {
      key: 'loanAmount',
      label: '15. Số tiền Ngân hàng giải ngân HTLS 0%',
      amount: loanAmount,
      formattedAmount: formatVNDExact(loanAmount),
      formulaExplanation: loanAmount > 0
        ? `${loanResult.loanPercent}% tính trên ${loanBasis === 'RAW_PRICE_INCL_VAT' ? 'Giá thô gồm VAT' : 'Tổng giá bán gồm VAT'}`
        : `0 VNĐ (Khách hàng tự chi trả theo tiến độ)`,
      category: 'FINANCING',
    },
    {
      key: 'equityAmount',
      label: '16. Vốn tự có khách hàng cần chuẩn bị',
      amount: equityAmount,
      formattedAmount: formatVNDExact(equityAmount),
      formulaExplanation: `Tổng giá trị HĐMB (${formatVNDExact(finalPrice)}) - Số tiền ngân hàng cho vay (${formatVNDExact(loanAmount)})`,
      category: 'FINANCING',
    },
    {
      key: 'earlyPaymentInterest',
      label: '17. Lãi suất thanh toán sớm (8%/năm)',
      amount: earlyPaymentInterest,
      formattedAmount: formatVNDExact(earlyPaymentInterest),
      formulaExplanation: earlyPaymentInterest > 0
        ? `Hưởng 8%/năm trên số tiền thanh toán sớm cho ${earlyDays} ngày trả trước hạn (Ít nhất 10 ngày)`
        : `0 VNĐ (Áp dụng khi đóng vốn tự có trước hạn ít nhất 10 ngày)`,
      category: 'BENEFIT',
    },
    {
      key: 'earlyKeyBenefit',
      label: '18. Quyền lợi nhận nhà sớm Sun Early Key',
      amount: 0,
      formattedAmount: earlyKeyQualified ? 'ĐỦ ĐIỀU KIỆN' : 'KHÔNG ÁP DỤNG',
      formulaExplanation: earlyKeyEligible
        ? (earlyKeyQualified ? 'Đã thanh toán >= 70% tổng giá bán, đủ điều kiện nhận bàn giao sớm Sun Early Key' : 'Chưa đạt tỷ lệ thanh toán tối thiểu 70%')
        : `Không thuộc tòa áp dụng Sun Early Key theo ${policy.policyCode}`,
      category: 'BENEFIT',
    },
  ]

  return {
    policyCode: policy.policyCode,
    policyName: policy.policyName,
    policyVersion: policy.version,
    policyEffectiveDate: policy.effectiveFrom,
    building: input.unit.building,
    unitNumber: input.unit.unitNumber,
    unitType,
    netArea: input.unit.netArea,

    rawPriceNet,
    rawPriceVAT,
    rawPriceGross,

    completionRate,
    completionNet,
    completionVAT,
    completionGross,

    kpbt,
    hasKpbtData: kpbt > 0,
    kpbtNote: 'Kinh phí bảo trì 2% (thu tại thời điểm nhận bàn giao căn hộ)',

    subtotalGross,

    noLoanDiscount,
    earlyPaymentDiscount,
    otherDiscounts,
    totalDiscount,

    finalPrice,

    loanBasis,
    loanAmount,
    equityAmount,
    totalCashRequired: equityAmount,

    earlyPaymentInterest,
    earlyDays,
    earlyKeyEligible,
    earlyKeyQualified,
    totalBenefits,

    paymentSchedule,
    calculationBreakdown,
  }
}
