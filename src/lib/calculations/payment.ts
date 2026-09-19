// ─────────────────────────────────────────
// PAYMENT SCHEDULE CALCULATION ENGINE
// ─────────────────────────────────────────

export interface ScheduleItem {
  name: string
  percentage?: number   // e.g. 5 for 5%
  fixedAmount?: number  // VND — nếu dùng fixed thay vì %
  dueDateNote?: string  // "T0", "T+30 ngày", "Bàn giao"
  relativeDays?: number
}

export interface PaymentInstallment {
  name: string
  percentage: number
  amount: number
  dueDateNote: string
  cumulativeAmount: number
  remainingAmount: number
}

export interface PaymentScheduleResult {
  installments: PaymentInstallment[]
  totalAmount: number
  totalPercentage: number
  isValid: boolean
  error?: string
}

export interface PaymentValidation {
  isValid: boolean
  totalPercentage: number
  error?: string
}

/**
 * Validate a payment schedule (total must equal 100%).
 */
export function validatePaymentSchedule(items: ScheduleItem[]): PaymentValidation {
  if (items.length === 0) {
    return { isValid: false, totalPercentage: 0, error: 'Chưa có đợt thanh toán nào' }
  }

  const total = items.reduce((sum, item) => sum + (item.percentage ?? 0), 0)
  const rounded = Math.round(total * 100) / 100 // tránh floating point drift

  if (rounded !== 100) {
    return {
      isValid: false,
      totalPercentage: rounded,
      error: `Tổng thanh toán phải bằng 100%, hiện tại: ${rounded}%`,
    }
  }

  const hasNegative = items.some((item) => (item.percentage ?? 0) < 0)
  if (hasNegative) {
    return {
      isValid: false,
      totalPercentage: rounded,
      error: 'Không cho phép đợt thanh toán âm',
    }
  }

  return { isValid: true, totalPercentage: 100 }
}

/**
 * Calculate full payment schedule from price + schedule items.
 * Does NOT round intermediate values.
 */
export function calculatePaymentSchedule(
  price: number,
  items: ScheduleItem[]
): PaymentScheduleResult {
  const validation = validatePaymentSchedule(items)

  if (!validation.isValid) {
    return {
      installments: [],
      totalAmount: 0,
      totalPercentage: validation.totalPercentage,
      isValid: false,
      error: validation.error,
    }
  }

  let cumulative = 0
  const installments: PaymentInstallment[] = items.map((item) => {
    const pct = item.percentage ?? 0
    const amount = item.fixedAmount ?? (price * pct) / 100
    cumulative += amount
    const remaining = price - cumulative

    return {
      name: item.name,
      percentage: pct,
      amount,
      dueDateNote: item.dueDateNote ?? '',
      cumulativeAmount: cumulative,
      remainingAmount: Math.max(0, remaining),
    }
  })

  return {
    installments,
    totalAmount: cumulative,
    totalPercentage: 100,
    isValid: true,
  }
}
