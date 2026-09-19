// ─────────────────────────────────────────
// LOAN CALCULATION ENGINE
// Supports: Equal Payment (Annuity) & Equal Principal (Dư nợ giảm dần)
// ─────────────────────────────────────────

export type RepaymentMethod = 'EQUAL_PAYMENT' | 'EQUAL_PRINCIPAL'

export interface LoanInput {
  principal: number           // VND — số tiền vay
  annualInterestRate: number  // e.g. 8.5 for 8.5%
  loanTermMonths: number      // số tháng
  repaymentMethod: RepaymentMethod
  // Optional: interest support period
  supportPeriodMonths?: number
  supportRate?: number        // lãi suất ưu đãi trong kỳ hỗ trợ
}

export interface LoanMonthlyEntry {
  month: number
  principal: number      // Gốc trả trong tháng
  interest: number       // Lãi trả trong tháng
  payment: number        // Tổng trả (gốc + lãi)
  remainingPrincipal: number
}

export interface LoanResult {
  principal: number
  annualInterestRate: number
  loanTermMonths: number
  repaymentMethod: RepaymentMethod

  monthlyPayment: number  // Trả đều mỗi tháng (chỉ EQUAL_PAYMENT)
  totalPrincipal: number
  totalInterest: number
  totalPayment: number

  schedule: LoanMonthlyEntry[]
}

/**
 * EQUAL_PAYMENT (Annuity / Trả đều)
 * Mỗi tháng trả cùng một khoản, gồm gốc và lãi thay đổi.
 */
function calcEqualPayment(input: LoanInput): LoanResult {
  const { principal, annualInterestRate, loanTermMonths } = input
  const monthlyRate = annualInterestRate / 100 / 12

  // Công thức PMT
  let monthlyPayment: number
  if (monthlyRate === 0) {
    monthlyPayment = principal / loanTermMonths
  } else {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
      (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
  }

  const schedule: LoanMonthlyEntry[] = []
  let remaining = principal

  for (let month = 1; month <= loanTermMonths; month++) {
    // Check if in support period (different rate)
    const isSupport =
      input.supportPeriodMonths && month <= input.supportPeriodMonths && input.supportRate !== undefined
    const rate = isSupport ? (input.supportRate! / 100 / 12) : monthlyRate

    const interest = remaining * rate
    const principalPaid = monthlyPayment - interest
    remaining = Math.max(0, remaining - principalPaid)

    schedule.push({
      month,
      principal: principalPaid,
      interest,
      payment: monthlyPayment,
      remainingPrincipal: remaining,
    })
  }

  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0)
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0)

  return {
    principal,
    annualInterestRate,
    loanTermMonths,
    repaymentMethod: 'EQUAL_PAYMENT',
    monthlyPayment,
    totalPrincipal: principal,
    totalInterest,
    totalPayment,
    schedule,
  }
}

/**
 * EQUAL_PRINCIPAL (Dư nợ giảm dần)
 * Mỗi tháng trả gốc bằng nhau, lãi giảm dần theo dư nợ.
 */
function calcEqualPrincipal(input: LoanInput): LoanResult {
  const { principal, annualInterestRate, loanTermMonths } = input
  const monthlyRate = annualInterestRate / 100 / 12
  const principalPerMonth = principal / loanTermMonths

  const schedule: LoanMonthlyEntry[] = []
  let remaining = principal

  for (let month = 1; month <= loanTermMonths; month++) {
    const isSupport =
      input.supportPeriodMonths && month <= input.supportPeriodMonths && input.supportRate !== undefined
    const rate = isSupport ? (input.supportRate! / 100 / 12) : monthlyRate

    const interest = remaining * rate
    const principalPaid = principalPerMonth
    const payment = principalPaid + interest
    remaining = Math.max(0, remaining - principalPaid)

    schedule.push({
      month,
      principal: principalPaid,
      interest,
      payment,
      remainingPrincipal: remaining,
    })
  }

  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0)
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0)
  const firstMonthPayment = schedule[0]?.payment ?? 0

  return {
    principal,
    annualInterestRate,
    loanTermMonths,
    repaymentMethod: 'EQUAL_PRINCIPAL',
    monthlyPayment: firstMonthPayment,
    totalPrincipal: principal,
    totalInterest,
    totalPayment,
    schedule,
  }
}

/**
 * Main loan calculation function.
 */
export function calculateLoan(input: LoanInput): LoanResult {
  if (input.repaymentMethod === 'EQUAL_PRINCIPAL') {
    return calcEqualPrincipal(input)
  }
  return calcEqualPayment(input)
}

/**
 * Calculate how much a customer needs to self-fund before bank disbursement.
 */
export function calculateLoanEquity(
  finalPrice: number,
  loanPercent: number // e.g. 70 for 70%
): { loanAmount: number; equityAmount: number } {
  const loanAmount = finalPrice * (loanPercent / 100)
  const equityAmount = finalPrice - loanAmount
  return { loanAmount, equityAmount }
}
