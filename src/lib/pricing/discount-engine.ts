// ─────────────────────────────────────────────────────────────
// DISCOUNT ENGINE (CHIẾT KHẤU & ƯU ĐÃI)
// Rule: Disounts are calculated STRICTLY on rawPriceNet (Giá thô chưa VAT)
// Never includes completion value, VAT, or KPBT.
// ─────────────────────────────────────────────────────────────

import { CalculationInput, PolicyVersion, EarlyPaymentRule } from './types'
import { roundMoney } from './rounding'

export interface DiscountResult {
  earlyBirdDiscount: number
  earlyBirdRate: number
  noLoanDiscount: number         // Chiết khấu không vay
  noLoanDiscountRate: number
  bankGuaranteeDiscount: number
  bankGuaranteeRate: number
  earlyPaymentDiscount: number   // Chiết khấu thanh toán sớm
  earlyPaymentDiscountRate: number
  matchedEarlyRule?: EarlyPaymentRule
  otherDiscounts: number         // Ưu đãi khác
  totalDiscount: number          // Tổng chiết khấu trừ vào giá
  finalGrossAfterDiscounts: number
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
 * Calculates all discounts and early payment benefits using Sun Group sequential formula
 */
export function calculateDiscounts(
  price1: number,
  price2OrInput: number | CalculationInput,
  inputOrPolicy?: CalculationInput | PolicyVersion,
  policyArg?: PolicyVersion
): DiscountResult {
  let basePriceGross: number
  let rawPriceNet: number
  let input: CalculationInput
  let policy: PolicyVersion

  if (typeof price2OrInput === 'number') {
    basePriceGross = price1
    rawPriceNet = price2OrInput
    input = inputOrPolicy as CalculationInput
    policy = policyArg as PolicyVersion
  } else {
    basePriceGross = price1
    rawPriceNet = price1
    input = price2OrInput as CalculationInput
    policy = inputOrPolicy as PolicyVersion
  }

  const roundingUnit = policy?.roundingUnit || 1
  const roundingMode = policy?.roundingMode || 'ROUND'
  const notes: string[] = []

  let currentRunning = basePriceGross

  // 1. Early Bird (1% nếu applyEarlyBird !== false)
  let earlyBirdDiscount = 0
  const applyEB = input.applyEarlyBird !== false
  const ebRate = applyEB ? 0.01 : 0
  if (applyEB) {
    const afterEB = roundMoney(currentRunning * (1 - ebRate), roundingUnit, roundingMode)
    earlyBirdDiscount = currentRunning - afterEB
    currentRunning = afterEB
    notes.push('Áp dụng ưu đãi Early Bird 1%')
  }

  // 2. Chiết khấu không vay (5%): Áp dụng khi KHÔNG VAY (Tiến độ chuẩn hoặc Thanh toán sớm)
  let noLoanDiscount = 0
  let noLoanDiscountRate = 0
  const isLoan = input.paymentOption === 'LOAN'
  if (!isLoan && policy.noLoanDiscount?.enabled) {
    noLoanDiscountRate = policy.noLoanDiscount.rate || 0.05
    const afterNoLoan = roundMoney(currentRunning * (1 - noLoanDiscountRate), roundingUnit, roundingMode)
    noLoanDiscount = currentRunning - afterNoLoan
    currentRunning = afterNoLoan
    notes.push(`Áp dụng chiết khấu không vay ${(noLoanDiscountRate * 100).toFixed(1)}%`)
  }

  // 3. Bảo lãnh ngân hàng (1% nếu applyBankGuarantee !== false)
  let bankGuaranteeDiscount = 0
  const applyBLNH = input.applyBankGuarantee !== false
  const blnhRate = applyBLNH ? 0.01 : 0
  if (applyBLNH) {
    const afterBLNH = roundMoney(currentRunning * (1 - blnhRate), roundingUnit, roundingMode)
    bankGuaranteeDiscount = currentRunning - afterBLNH
    currentRunning = afterBLNH
    notes.push('Áp dụng chiết khấu không nhận bảo lãnh ngân hàng 1%')
  }

  // 4. Chiết khấu thanh toán sớm (Early Payment Discount)
  let earlyPaymentDiscount = 0
  let earlyPaymentDiscountRate = 0
  let matchedEarlyRule: EarlyPaymentRule | undefined

  if (input.paymentOption === 'EARLY_PAYMENT') {
    matchedEarlyRule = findMatchingEarlyRule(
      policy,
      input.earlyPaymentPercent,
      input.earlyPaymentDeadline
    )

    if (matchedEarlyRule) {
      earlyPaymentDiscountRate = matchedEarlyRule.discountRate
      const afterTTS = roundMoney(currentRunning * (1 - earlyPaymentDiscountRate), roundingUnit, roundingMode)
      earlyPaymentDiscount = currentRunning - afterTTS
      currentRunning = afterTTS
      notes.push(
        `Áp dụng chiết khấu thanh toán sớm ${(earlyPaymentDiscountRate * 100).toFixed(1)}% (${matchedEarlyRule.paymentPercent}%)`
      )
    }
  }

  // 5. Ưu đãi khác (Custom Discounts)
  let otherDiscounts = 0
  if (input.customDiscounts && input.customDiscounts.length > 0) {
    for (const d of input.customDiscounts) {
      if (d.amount > 0) {
        otherDiscounts += d.amount
        currentRunning = Math.max(0, currentRunning - d.amount)
      } else if (d.rate && d.rate > 0) {
        const amt = roundMoney(currentRunning * d.rate, roundingUnit, roundingMode)
        otherDiscounts += amt
        currentRunning = Math.max(0, currentRunning - amt)
      }
    }
  }

  // 6. Lợi ích lãi suất thanh toán sớm (8%/năm khi thanh toán sớm >= 10 ngày trước hạn)
  let earlyPaymentInterest = 0
  let earlyDays = 0
  if (input.actualPaymentDate && input.scheduledDueDate) {
    const actual = new Date(input.actualPaymentDate).getTime()
    const scheduled = new Date(input.scheduledDueDate).getTime()
    const diffTime = scheduled - actual
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays >= 10) {
      earlyDays = diffDays
      const interestRate = policy.earlyPaymentInterestRate || 0.08
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

  const totalDiscount = earlyBirdDiscount + noLoanDiscount + bankGuaranteeDiscount + earlyPaymentDiscount + otherDiscounts

  return {
    earlyBirdDiscount,
    earlyBirdRate: ebRate,
    noLoanDiscount,
    noLoanDiscountRate,
    bankGuaranteeDiscount,
    bankGuaranteeRate: blnhRate,
    earlyPaymentDiscount,
    earlyPaymentDiscountRate,
    matchedEarlyRule,
    otherDiscounts,
    totalDiscount,
    finalGrossAfterDiscounts: currentRunning,
    earlyPaymentInterest,
    earlyDays,
    notes,
  }
}
