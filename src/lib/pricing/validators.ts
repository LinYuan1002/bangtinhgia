// ─────────────────────────────────────────────────────────────
// VALIDATION ENGINE & MUTUAL EXCLUSIVITY CHECKER
// ─────────────────────────────────────────────────────────────

import { UnitType, CalculationInput, PolicyVersion } from './types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Normalizes any unit type string (from Excel, DB, or UI) into standard UnitType enum.
 */
export function normalizeUnitType(raw: string | number): UnitType {
  const s = String(raw || '').toLowerCase().trim()
  if (s.includes('studio') || s.includes('std') || s === '0') return 'STUDIO'
  if (s.includes('1br+') || s.includes('1br_plus') || s.includes('1pn+') || s.includes('1 pn+') || s.includes('1br') || s.includes('1pn') || s === '1') {
    return '1BR_PLUS'
  }
  if (s.includes('2br') || s.includes('2pn') || s.includes('2 pn') || s === '2') return '2BR'
  if (s.includes('3br') || s.includes('3pn') || s.includes('3 pn') || s === '3') return '3BR'

  return '1BR_PLUS' // sensible default
}

/**
 * Validates calculation input and enforces mutual exclusivity rules.
 */
export function validateCalculationInput(
  input: CalculationInput,
  policy: PolicyVersion
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!input.unit) {
    errors.push('Chưa có dữ liệu căn hộ')
    return { isValid: false, errors, warnings }
  }

  if (input.unit.basePrice <= 0) {
    errors.push('Giá bán căn hộ không hợp lệ hoặc bằng 0')
  }

  if (input.unit.netArea <= 0) {
    errors.push('Diện tích thông thủy không hợp lệ hoặc bằng 0')
  }

  // Mutual exclusivity validations
  if (input.paymentOption === 'LOAN') {
    if (input.earlyPaymentPercent && input.earlyPaymentPercent > 0) {
      warnings.push('Chính sách vay ngân hàng không áp dụng đồng thời với Chiết khấu thanh toán sớm')
    }
  }

  if (input.paymentOption === 'EARLY_PAYMENT') {
    if (input.loanPercent && input.loanPercent > 0) {
      warnings.push('Thanh toán sớm bằng vốn tự có không áp dụng đồng thời với Gói hỗ trợ vay ngân hàng')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
