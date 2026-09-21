// ─────────────────────────────────────────────────────────────
// LOAN ENGINE (NGÂN HÀNG HỖ TRỢ LÃI SUẤT & VỐN TỰ CÓ)
// Dynamic loanBasis: RAW_PRICE_INCL_VAT vs TOTAL_PRICE_INCL_VAT
// ─────────────────────────────────────────────────────────────

import { CalculationInput, PolicyVersion } from './types'
import { roundMoney } from './rounding'

export interface LoanCalculationResult {
  isLoanEligible: boolean
  loanPercent: number
  loanBasis: 'RAW_PRICE_INCL_VAT' | 'TOTAL_PRICE_INCL_VAT'
  baseAmountForLoan: number
  loanAmount: number            // Số tiền ngân hàng giải ngân
  equityAmount: number          // Vốn tự có khách hàng cần chuẩn bị
  supportPeriodMonths: number   // Số tháng HTLS 0% (e.g. 18, 24)
  supportRate: number           // Lãi suất trong thời gian HTLS (0%)
  estimatedMonthlyPayment: number // Ước tính số tiền trả góp hàng tháng sau HTLS (gốc + lãi)
  estimatedFirstMonthInterest: number
  notes: string[]
}

/**
 * Calculates loan amount and equity requirement according to policy basis
 */
export function calculateLoanDetails(
  rawPriceGross: number,
  finalPrice: number,
  input: CalculationInput,
  policy: PolicyVersion
): LoanCalculationResult {
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'
  const notes: string[] = []

  if (input.paymentOption !== 'LOAN') {
    return {
      isLoanEligible: false,
      loanPercent: 0,
      loanBasis: policy.loanRules?.loanBasis || 'RAW_PRICE_INCL_VAT',
      baseAmountForLoan: 0,
      loanAmount: 0,
      equityAmount: finalPrice,
      supportPeriodMonths: 0,
      supportRate: 0,
      estimatedMonthlyPayment: 0,
      estimatedFirstMonthInterest: 0,
      notes: ['Khách hàng không sử dụng gói hỗ trợ vay ngân hàng'],
    }
  }

  const maxAllowedPercent = policy.loanRules?.maxLoanPercent ?? 70
  const requestedPercent = input.loanPercent ?? maxAllowedPercent
  const actualPercent = Math.min(requestedPercent, maxAllowedPercent)
  const loanBasis = policy.loanRules?.loanBasis || 'RAW_PRICE_INCL_VAT'

  let baseAmountForLoan = 0
  if (loanBasis === 'RAW_PRICE_INCL_VAT') {
    baseAmountForLoan = rawPriceGross
    notes.push(`Hạn mức vay tối đa tính trên Giá căn hộ thô gồm VAT (Tối đa ${maxAllowedPercent}%)`)
  } else {
    baseAmountForLoan = finalPrice
    notes.push(`Hạn mức vay tối đa tính trên Tổng giá bán gồm VAT (Tối đa ${maxAllowedPercent}%)`)
  }

  const loanAmount = roundMoney(
    baseAmountForLoan * (actualPercent / 100),
    roundingUnit,
    roundingMode
  )

  // Vốn tự có = Tổng giá trị HĐ - Số tiền vay
  const equityAmount = Math.max(0, finalPrice - loanAmount)

  // Ước tính thanh toán góp hàng tháng sau HTLS
  const loanTermMonths = input.loanTermMonths || 240 // mặc định 20 năm (240 tháng)
  const annualRate = input.annualInterestRate || 9.5 // mặc định 9.5%/năm sau ưu đãi
  const monthlyRate = annualRate / 100 / 12

  let estimatedMonthlyPayment = 0
  let estimatedFirstMonthInterest = 0

  if (loanAmount > 0 && monthlyRate > 0 && loanTermMonths > 0) {
    const factor = Math.pow(1 + monthlyRate, loanTermMonths)
    estimatedMonthlyPayment = roundMoney(
      (loanAmount * (monthlyRate * factor)) / (factor - 1),
      roundingUnit,
      roundingMode
    )
    estimatedFirstMonthInterest = roundMoney(
      loanAmount * monthlyRate,
      roundingUnit,
      roundingMode
    )
  }

  return {
    isLoanEligible: true,
    loanPercent: actualPercent,
    loanBasis,
    baseAmountForLoan,
    loanAmount,
    equityAmount,
    supportPeriodMonths: policy.loanRules?.supportPeriodMonths || 18,
    supportRate: policy.loanRules?.supportRate || 0,
    estimatedMonthlyPayment,
    estimatedFirstMonthInterest,
    notes,
  }
}
