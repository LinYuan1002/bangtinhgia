// ─────────────────────────────────────────────────────────────
// DISCOUNT ENGINE (CHIẾT KHẤU & ƯU ĐÃI)
// Rule: Disounts are calculated STRICTLY on rawPriceNet (Giá thô chưa VAT)
// Never includes completion value, VAT, or KPBT.
// ─────────────────────────────────────────────────────────────

import { CalculationInput, PolicyVersion, EarlyPaymentRule } from './types'
import { roundMoney } from './rounding'

export interface DiscountResult {
  noLoanDiscount: number         // Chiết khấu không vay
  noLoanDiscountRate: number
  earlyPaymentDiscount: number   // Chiết khấu thanh toán sớm
  earlyPaymentDiscountRate: number
  matchedEarlyRule?: EarlyPaymentRule
  otherDiscounts: number         // Ưu đãi khác
  totalDiscount: number          // Tổng chiết khấu trừ vào giá
  earlyPaymentInterest: number   // Lợi ích lãi suất thanh toán sớm (8%/năm nếu >= 10 ngày)
  earlyDays: number
  notes: string[]
}

/**
 * Finds matching early payment rule from policy based on percentage and deadline
 */
export function findMatchingEarlyRule(
  policy: PolicyVersion,
  percent?: number,
  deadline?: string
): EarlyPaymentRule | undefined {
  if (!percent || !policy.earlyPaymentRules || policy.earlyPaymentRules.length === 0) {
    return undefined
  }

  // 1. Exact match by both percent and deadline
  if (deadline) {
    const exact = policy.earlyPaymentRules.find(
      (r) => r.paymentPercent === percent && r.deadline === deadline
    )
    if (exact) return exact
  }

  // 2. Match by percent (take the first or default rule)
  const byPercent = policy.earlyPaymentRules.filter((r) => r.paymentPercent === percent)
  if (byPercent.length > 0) {
    return byPercent[0]
  }

  return undefined
}

/**
 * Calculates all discounts and early payment benefits
 */
export function calculateDiscounts(
  rawPriceNet: number,
  input: CalculationInput,
  policy: PolicyVersion
): DiscountResult {
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'
  const notes: string[] = []

  let noLoanDiscount = 0
  let noLoanDiscountRate = 0
  let earlyPaymentDiscount = 0
  let earlyPaymentDiscountRate = 0
  let matchedEarlyRule: EarlyPaymentRule | undefined
  let otherDiscounts = 0
  let earlyPaymentInterest = 0
  let earlyDays = 0

  // 1. Chiết khấu không vay (No Loan Discount)
  // Chỉ áp dụng khi KH chọn phương án KHÔNG VAY (Thanh toán theo tiến độ chuẩn bằng vốn tự có)
  if (input.paymentOption === 'NO_LOAN' && policy.noLoanDiscount?.enabled) {
    noLoanDiscountRate = policy.noLoanDiscount.rate
    noLoanDiscount = roundMoney(rawPriceNet * noLoanDiscountRate, roundingUnit, roundingMode)
    notes.push(`Áp dụng chiết khấu không vay ${(noLoanDiscountRate * 100).toFixed(1)}% tính trên giá thô chưa VAT`)
  }

  // 2. Chiết khấu thanh toán sớm (Early Payment Discount)
  // Áp dụng khi KH chọn phương án THANH TOÁN SỚM
  if (input.paymentOption === 'EARLY_PAYMENT') {
    matchedEarlyRule = findMatchingEarlyRule(
      policy,
      input.earlyPaymentPercent,
      input.earlyPaymentDeadline
    )

    if (matchedEarlyRule) {
      earlyPaymentDiscountRate = matchedEarlyRule.discountRate
      earlyPaymentDiscount = roundMoney(
        rawPriceNet * earlyPaymentDiscountRate,
        roundingUnit,
        roundingMode
      )
      notes.push(
        `Áp dụng chiết khấu thanh toán sớm ${(earlyPaymentDiscountRate * 100).toFixed(1)}% (${matchedEarlyRule.paymentPercent}%, hạn ${matchedEarlyRule.deadlineLabel || matchedEarlyRule.deadline}) tính trên giá thô chưa VAT`
      )
    }
  }

  // 3. Ưu đãi khác (Custom Discounts)
  if (input.customDiscounts && input.customDiscounts.length > 0) {
    for (const d of input.customDiscounts) {
      if (d.amount > 0) {
        otherDiscounts += d.amount
      } else if (d.rate && d.rate > 0) {
        otherDiscounts += roundMoney(rawPriceNet * d.rate, roundingUnit, roundingMode)
      }
    }
  }

  // 4. Lợi ích lãi suất thanh toán sớm (8%/năm khi thanh toán sớm >= 10 ngày trước hạn)
  if (input.actualPaymentDate && input.scheduledDueDate) {
    const actual = new Date(input.actualPaymentDate).getTime()
    const scheduled = new Date(input.scheduledDueDate).getTime()
    const diffTime = scheduled - actual
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays >= 10) {
      earlyDays = diffDays
      const interestRate = policy.earlyPaymentInterestRate || 0.08
      // Áp dụng trên số tiền thanh toán sớm (dựa trên tỷ lệ thanh toán sớm hoặc số tiền thực đóng)
      const baseEarlyAmount = input.earlyPaymentPercent 
        ? (rawPriceNet * (input.earlyPaymentPercent / 100))
        : rawPriceNet
      earlyPaymentInterest = roundMoney(
        baseEarlyAmount * interestRate * (earlyDays / 365),
        roundingUnit,
        roundingMode
      )
      notes.push(
        `Hưởng lãi suất thanh toán sớm ${(interestRate * 100).toFixed(1)}%/năm cho ${earlyDays} ngày thanh toán trước hạn`
      )
    }
  }

  const totalDiscount = noLoanDiscount + earlyPaymentDiscount + otherDiscounts

  return {
    noLoanDiscount,
    noLoanDiscountRate,
    earlyPaymentDiscount,
    earlyPaymentDiscountRate,
    matchedEarlyRule,
    otherDiscounts,
    totalDiscount,
    earlyPaymentInterest,
    earlyDays,
    notes,
  }
}
