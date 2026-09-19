// ─────────────────────────────────────────
// CALCULATIONS — Public API
// Re-exports all calculation modules & helpers
// ─────────────────────────────────────────

export * from './price'
export * from './discount'
export * from './payment'
export * from './loan'
export * from './cashflow'
export * from './quote'

// ─────────────────────────────────────────
// CURRENCY & FORMATTING UTILITIES
// ─────────────────────────────────────────

/**
 * Format a VND integer value for display.
 * e.g. 2500000000 → "2.500.000.000 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a compact VND value.
 * e.g. 2500000000 → "2,5 tỷ"
 */
export function formatVNDCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000
    return `${ty % 1 === 0 ? ty.toFixed(0) : ty.toFixed(2)} tỷ`
  }
  if (amount >= 1_000_000) {
    const trieu = amount / 1_000_000
    return `${trieu % 1 === 0 ? trieu.toFixed(0) : trieu.toFixed(1)} triệu`
  }
  return formatVND(amount)
}

/**
 * Format price per square meter
 */
export function formatPricePerM2(price: number): string {
  return `${formatVND(price)}/m²`
}

/**
 * Format area in m²
 */
export function formatArea(area: number): string {
  return `${area.toFixed(1)} m²`
}

/**
 * Parse a raw currency string to integer VND.
 * e.g. "2,500,000,000" or "2.500.000.000" or "2500000000" → 2500000000
 */
export function parseCurrency(raw: string | number): number {
  if (typeof raw === 'number') return Math.round(raw)
  const cleaned = raw.replace(/[.,\s₫đ]/g, '')
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Backward compatibility helpers for loan & cash
 */
export function calculateLoanPayment(
  principal: number,
  annualInterestRate: number,
  loanTermMonths: number
): number {
  if (principal <= 0 || loanTermMonths <= 0) return 0
  const monthlyRate = annualInterestRate / 100 / 12
  if (monthlyRate === 0) return principal / loanTermMonths
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
    (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
  )
}

export function calculateTotalInterest(
  principal: number,
  annualInterestRate: number,
  loanTermMonths: number
): number {
  const monthly = calculateLoanPayment(principal, annualInterestRate, loanTermMonths)
  return Math.max(0, monthly * loanTermMonths - principal)
}

export function calculateCashRequired(finalPrice: number, loanAmount: number): number {
  return Math.max(0, finalPrice - loanAmount)
}
