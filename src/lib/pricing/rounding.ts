// ─────────────────────────────────────────────────────────────
// CONFIGURABLE ROUNDING ENGINE FOR VIETNAMESE DONG (VND)
// Ensures clean integer rounding without floating point drift
// ─────────────────────────────────────────────────────────────

export type RoundingMode = 'ROUND' | 'FLOOR' | 'CEIL'

/**
 * Rounds a financial amount based on unit and rounding mode.
 * @param amount Raw calculation number
 * @param unit Rounding precision (1 for exact VND, 1000 for thousand VND, etc.)
 * @param mode 'ROUND' (standard), 'FLOOR' (down), 'CEIL' (up)
 */
export function roundMoney(
  amount: number,
  unit: number = 1,
  mode: RoundingMode = 'ROUND'
): number {
  if (isNaN(amount) || !isFinite(amount)) return 0
  if (unit <= 1) {
    if (mode === 'FLOOR') return Math.floor(amount)
    if (mode === 'CEIL') return Math.ceil(amount)
    return Math.round(amount)
  }

  const factor = amount / unit
  let roundedFactor: number
  if (mode === 'FLOOR') roundedFactor = Math.floor(factor)
  else if (mode === 'CEIL') roundedFactor = Math.ceil(factor)
  else roundedFactor = Math.round(factor)

  return roundedFactor * unit
}

/**
 * Format exact VND string for clean presentation.
 * e.g. 2350000000 → "2.350.000.000 ₫"
 */
export function formatVNDExact(amount: number): string {
  const rounded = Math.round(amount)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(rounded)
}
