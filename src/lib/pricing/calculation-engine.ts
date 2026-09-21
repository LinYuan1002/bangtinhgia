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
  const {
    rawPriceNet,
    rawPriceVAT,
    rawPriceGrossExclKPBT,
    rawPriceGross,
    kpbt: rawKPBT,
  } = rawPriceResult

  // 4. Completion value calculation (dynamic per policy VAT mode)
  const completionResult = calculateCompletionValue(input.unit, policy)
  const {
    completionNet,
    completionVAT,
    completionGross,
    ratePerM2: completionRate,
  } = completionResult

  // 5. Kinh phí bảo trì (KPBT 2%)
  const kpbt = rawKPBT || roundMoney(rawPriceNet * (policy.kpbtRate || 0.02), roundingUnit, roundingMode)

  // 6. Subtotal gross before discounts (Giá niêm yết gồm VAT & KPBT + Hoàn thiện)
  const subtotalGross = rawPriceGross + completionGross

  // 7. Discounts & benefits calculation (calculated sequentially as verified in Sun Group Excel)
  const discountResult = calculateDiscounts(rawPriceGross, rawPriceNet, input, policy)
  const {
    earlyBirdDiscount,
    bankGuaranteeDiscount,
    noLoanDiscount,
    earlyPaymentDiscount,
    otherDiscounts,
    totalDiscount,
    finalGrossAfterDiscounts,
    earlyPaymentInterest,
    earlyDays,
  } = discountResult

  // 8. Final price
  // finalPriceGross: Tổng giá trị gồm VAT & KPBT khách hàng thanh toán sau chiết khấu
  const finalPriceGross = finalGrossAfterDiscounts + completionGross
  // finalPrice: Giá tính HĐMB sau chiết khấu gồm 10% VAT (không gồm KPBT 2%)
  const finalPriceNet = policy.kpbtIncludedInPrice
    ? roundMoney(finalPriceGross / (1 + policy.vatRate + (policy.kpbtRate || 0.02)), roundingUnit, roundingMode)
    : roundMoney(finalPriceGross / (1 + policy.vatRate), roundingUnit, roundingMode)
  const finalPrice = roundMoney(finalPriceNet * (1 + policy.vatRate), roundingUnit, roundingMode)
  const finalKPBT = finalPriceGross - finalPrice

  // Giá thô sau chiết khấu gồm VAT (chưa gồm gói hoàn thiện nếu có)
  const finalRawNet = policy.kpbtIncludedInPrice
    ? roundMoney(finalGrossAfterDiscounts / (1 + policy.vatRate + (policy.kpbtRate || 0.02)), roundingUnit, roundingMode)
    : roundMoney(finalGrossAfterDiscounts / (1 + policy.vatRate), roundingUnit, roundingMode)
  const finalRawGrossExclKPBT = roundMoney(finalRawNet * (1 + policy.vatRate), roundingUnit, roundingMode)

  // 9. Loan & Equity details
  // Loan is calculated on discounted contract price according to policy loanBasis
  const loanResult = calculateLoanDetails(finalRawGrossExclKPBT, finalPrice, input, policy)
  const { loanAmount, equityAmount, loanBasis } = loanResult

  // 10. Payment schedule generation (with deposit deduction)
  const scheduleResult = generatePaymentSchedule(
    finalPriceGross,
    input,
    policy,
    loanAmount,
    finalPriceNet
  )
  const { earlyKeyEligible, earlyKeyQualified, milestones: paymentSchedule } = scheduleResult

  // 11. Total benefits (Chiết khấu + Lãi suất thanh toán sớm)
  const totalBenefits = totalDiscount + earlyPaymentInterest

  // 12. Build full calculation breakdown (18 transparent items with formulas & tooltips)
  const calculationBreakdown: BreakdownItem[] = [
    {
      key: 'rawPriceGross',
      label: '1. Giá niêm yết bảng hàng (gồm VAT 10% & KPBT 2%)',
      amount: rawPriceGross,
      formattedAmount: formatVNDExact(rawPriceGross),
      formulaExplanation: `Giá niêm yết căn hộ thô theo bảng giá chính thức CĐT Sun Group`,
      category: 'RAW_PRICE',
    },
    {
      key: 'rawPriceNet',
      label: '2. Giá căn hộ thô (chưa VAT & KPBT)',
      amount: rawPriceNet,
      formattedAmount: formatVNDExact(rawPriceNet),
      formulaExplanation: policy.kpbtIncludedInPrice
        ? `Giá niêm yết (${formatVNDExact(rawPriceGross)}) / 1.12 (${policy.vatRate * 100}% VAT + ${(policy.kpbtRate || 0.02) * 100}% KPBT)`
        : `Giá niêm yết / (1 + ${policy.vatRate * 100}% VAT)`,
      category: 'RAW_PRICE',
    },
    {
      key: 'rawPriceVAT',
      label: `3. Thuế VAT căn hộ thô (${policy.vatRate * 100}%)`,
      amount: rawPriceVAT,
      formattedAmount: formatVNDExact(rawPriceVAT),
      formulaExplanation: `Giá thô chưa thuế (${formatVNDExact(rawPriceNet)}) x ${policy.vatRate * 100}%`,
      category: 'RAW_PRICE',
    },
    {
      key: 'kpbt',
      label: '4. Kinh phí bảo trì gốc (KPBT 2%)',
      amount: kpbt,
      formattedAmount: formatVNDExact(kpbt),
      formulaExplanation: `2% tính trên giá căn hộ thô chưa VAT (Nộp tại thời điểm nhận bàn giao)`,
      category: 'TAX_FEE',
    },
    {
      key: 'completionGross',
      label: `5. Giá trị hoàn thiện (${unitType} - ${input.unit.netArea} m²)`,
      amount: completionGross,
      formattedAmount: formatVNDExact(completionGross),
      formulaExplanation: policy.completionPriceIncludesVAT
        ? `${input.unit.netArea} m² x ${formatVNDExact(completionRate)}/m² (Đã gồm 10% VAT theo ${policy.policyCode})`
        : `${input.unit.netArea} m² x ${formatVNDExact(completionRate)}/m² + 10% VAT (theo ${policy.policyCode})`,
      category: 'COMPLETION',
    },
    {
      key: 'subtotalGross',
      label: '6. Tổng giá trị gồm VAT & KPBT trước ưu đãi',
      amount: subtotalGross,
      formattedAmount: formatVNDExact(subtotalGross),
      formulaExplanation: `Giá thô niêm yết (${formatVNDExact(rawPriceGross)}) + Hoàn thiện (${formatVNDExact(completionGross)})`,
      category: 'FINAL',
    },
    {
      key: 'earlyBirdDiscount',
      label: '7. Ưu đãi Early Bird (1%)',
      amount: earlyBirdDiscount,
      formattedAmount: formatVNDExact(earlyBirdDiscount),
      formulaExplanation: earlyBirdDiscount > 0
        ? `1% tính theo chuỗi chiết khấu lũy kế bảng hàng Sun Group`
        : `0 VNĐ (Không áp dụng)`,
      category: 'DISCOUNT',
    },
    {
      key: 'noLoanDiscount',
      label: '8. Chiết khấu không vay ngân hàng (5%)',
      amount: noLoanDiscount,
      formattedAmount: formatVNDExact(noLoanDiscount),
      formulaExplanation: noLoanDiscount > 0
        ? `5% áp dụng khi khách hàng thanh toán theo tiến độ chuẩn hoặc thanh toán sớm bằng vốn tự có`
        : `0 VNĐ (Không áp dụng cho phương án Vay Ngân Hàng HTLS 0%)`,
      category: 'DISCOUNT',
    },
    {
      key: 'bankGuaranteeDiscount',
      label: '9. Chiết khấu không nhận bảo lãnh ngân hàng (1%)',
      amount: bankGuaranteeDiscount,
      formattedAmount: formatVNDExact(bankGuaranteeDiscount),
      formulaExplanation: bankGuaranteeDiscount > 0
        ? `1% chiết khấu không bảo lãnh ngân hàng theo chính sách bán hàng`
        : `0 VNĐ (Không áp dụng)`,
      category: 'DISCOUNT',
    },
    {
      key: 'earlyPaymentDiscount',
      label: '10. Chiết khấu thanh toán sớm',
      amount: earlyPaymentDiscount,
      formattedAmount: formatVNDExact(earlyPaymentDiscount),
      formulaExplanation: earlyPaymentDiscount > 0
        ? `Chiết khấu ${(discountResult.earlyPaymentDiscountRate * 100).toFixed(1)}% khi chọn gói Thanh toán sớm ${input.earlyPaymentPercent}%`
        : `0 VNĐ (Áp dụng khi chọn phương án Thanh toán sớm)`,
      category: 'DISCOUNT',
    },
    {
      key: 'otherDiscounts',
      label: '11. Ưu đãi & Chiết khấu khác',
      amount: otherDiscounts,
      formattedAmount: formatVNDExact(otherDiscounts),
      formulaExplanation: otherDiscounts > 0
        ? `Tổng các khoản ưu đãi bổ sung khác`
        : `0 VNĐ`,
      category: 'DISCOUNT',
    },
    {
      key: 'totalDiscount',
      label: '12. Tổng chiết khấu được hưởng',
      amount: totalDiscount,
      formattedAmount: formatVNDExact(totalDiscount),
      formulaExplanation: `Tổng cộng các khoản chiết khấu lũy kế theo bảng tính Sun Group`,
      category: 'DISCOUNT',
    },
    {
      key: 'finalPriceGross',
      label: '13. Tổng giá thanh toán sau chiết khấu (gồm VAT & KPBT)',
      amount: finalPriceGross,
      formattedAmount: formatVNDExact(finalPriceGross),
      formulaExplanation: `Tổng trước ưu đãi (${formatVNDExact(subtotalGross)}) - Tổng chiết khấu (${formatVNDExact(totalDiscount)})`,
      category: 'FINAL',
    },
    {
      key: 'finalPrice',
      label: '14. Giá tính Hợp đồng mua bán (đã gồm 10% VAT)',
      amount: finalPrice,
      formattedAmount: formatVNDExact(finalPrice),
      formulaExplanation: `Giá HĐMB gồm VAT (không gồm KPBT 2%), dùng để làm căn cứ giải ngân ngân hàng và các đợt đóng tiền`,
      category: 'FINAL',
    },
    {
      key: 'finalKPBT',
      label: '15. Kinh phí bảo trì thực tế (2% nộp khi nhận nhà)',
      amount: finalKPBT,
      formattedAmount: formatVNDExact(finalKPBT),
      formulaExplanation: `Kinh phí bảo trì nộp tại đợt thông báo bàn giao căn hộ`,
      category: 'TAX_FEE',
    },
    {
      key: 'loanAmount',
      label: '16. Ngân hàng giải ngân gói HTLS 0%',
      amount: loanAmount,
      formattedAmount: formatVNDExact(loanAmount),
      formulaExplanation: loanAmount > 0
        ? `${loanResult.loanPercent}% tính trên Giá HĐMB gồm VAT (${formatVNDExact(finalPrice)})`
        : `0 VNĐ (Khách hàng thanh toán theo tiến độ bằng vốn tự có)`,
      category: 'FINANCING',
    },
    {
      key: 'equityAmount',
      label: '17. Vốn tự có khách hàng cần chuẩn bị',
      amount: equityAmount,
      formattedAmount: formatVNDExact(equityAmount),
      formulaExplanation: `Tổng giá trị HĐMB (${formatVNDExact(finalPrice)}) - Số tiền ngân hàng cho vay (${formatVNDExact(loanAmount)})`,
      category: 'FINANCING',
    },
    {
      key: 'earlyPaymentInterest',
      label: '18. Lãi suất thanh toán sớm (8%/năm)',
      amount: earlyPaymentInterest,
      formattedAmount: formatVNDExact(earlyPaymentInterest),
      formulaExplanation: earlyPaymentInterest > 0
        ? `Hưởng 8%/năm trên số tiền thanh toán sớm cho ${earlyDays} ngày trả trước hạn (Ít nhất 10 ngày)`
        : `0 VNĐ (Áp dụng khi đóng vốn tự có trước hạn ít nhất 10 ngày)`,
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
    rawPriceGrossExclKPBT,
    rawPriceGross,

    completionRate,
    completionNet,
    completionVAT,
    completionGross,

    kpbt: finalKPBT,
    hasKpbtData: finalKPBT > 0,
    kpbtNote: 'Kinh phí bảo trì 2% (thu tại thời điểm nhận bàn giao căn hộ)',

    subtotalGross,

    earlyBirdDiscount,
    bankGuaranteeDiscount,
    noLoanDiscount,
    earlyPaymentDiscount,
    otherDiscounts,
    totalDiscount,

    finalPrice,
    finalPriceGross,

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
