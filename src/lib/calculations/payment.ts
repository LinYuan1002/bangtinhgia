// ─────────────────────────────────────────
// PAYMENT SCHEDULE CALCULATION ENGINE
// ─────────────────────────────────────────

export interface ScheduleItem {
  name: string
  percentage?: number   // e.g. 5 for 5%
  fixedAmount?: number  // VND — nếu dùng fixed thay vì %
  dueDateNote?: string  // "T0", "T+30 ngày", "Bàn giao"
  relativeDays?: number
  isDeposit?: boolean
  deductDeposit?: boolean
}

export interface PaymentInstallment {
  name: string
  percentage: number
  amount: number
  dueDateNote: string
  cumulativeAmount: number
  remainingAmount: number
  isDeposit?: boolean
}

export interface PaymentScheduleResult {
  installments: PaymentInstallment[]
  totalAmount: number
  totalPercentage: number
  depositAmount: number
  isValid: boolean
  error?: string
}

export interface PaymentValidation {
  isValid: boolean
  totalPercentage: number
  error?: string
}

/**
 * Determine the deposit amount based on unit type and bedroom count:
 * - Studio: 50.000.000 VNĐ
 * - 1BR / 1PN / 1PN+: 100.000.000 VNĐ
 * - 2BR / 2PN / 2PN+: 150.000.000 VNĐ
 * - 3BR / 3PN: 200.000.000 VNĐ
 * - Or explicit `unit.depositAmount` if configured.
 */
export function getUnitDeposit(unit?: any): number {
  if (!unit) return 100_000_000

  if (typeof unit.depositAmount === 'number' && unit.depositAmount > 0) {
    return unit.depositAmount
  }

  const typeName = (unit.unitTypeName || unit.unitType || unit.name || '').toLowerCase()
  const bedrooms = typeof unit.bedrooms === 'number' ? unit.bedrooms : null

  // 1. Studio: 50 triệu
  if (typeName.includes('studio') || typeName.includes('std') || bedrooms === 0) {
    return 50_000_000
  }

  // 2. 1 Phòng Ngủ / 1BR / 1PN / 1PN+: 100 triệu
  if (
    typeName.includes('1pn') ||
    typeName.includes('1br') ||
    typeName.includes('1 pn') ||
    typeName.includes('1 phòng ngủ') ||
    bedrooms === 1
  ) {
    return 100_000_000
  }

  // 3. 2 Phòng Ngủ / 2BR / 2PN: 150 triệu
  if (
    typeName.includes('2pn') ||
    typeName.includes('2br') ||
    typeName.includes('2 pn') ||
    typeName.includes('2 phòng ngủ') ||
    bedrooms === 2
  ) {
    return 150_000_000
  }

  // 4. 3 Phòng Ngủ / 3BR / 3PN: 200 triệu
  if (
    typeName.includes('3pn') ||
    typeName.includes('3br') ||
    typeName.includes('3 pn') ||
    typeName.includes('3 phòng ngủ') ||
    (bedrooms !== null && bedrooms >= 3)
  ) {
    return 200_000_000
  }

  return 100_000_000
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
 * Calculate full payment schedule from price + schedule items + unit type.
 * Supports unit-specific deposit deduction on Step 2 as demonstrated in official Sun Group Excel sheets.
 */
export function calculatePaymentSchedule(
  price: number,
  items: ScheduleItem[],
  unit?: any
): PaymentScheduleResult {
  const validation = validatePaymentSchedule(items)

  if (!validation.isValid || price <= 0) {
    return {
      installments: [],
      totalAmount: 0,
      totalPercentage: validation.totalPercentage,
      depositAmount: getUnitDeposit(unit),
      isValid: validation.isValid && price > 0,
      error: validation.error,
    }
  }

  const depositAmount = getUnitDeposit(unit)

  // Identify deposit step (usually step 1)
  const depositIndex = items.findIndex(
    (it, idx) =>
      it.isDeposit ||
      (idx === 0 &&
        ((it.percentage === 0) ||
          it.fixedAmount != null ||
          it.name.toLowerCase().includes('cọc') ||
          it.name.toLowerCase().includes('ttđc') ||
          it.name.toLowerCase().includes('hđthnv')))
  )

  // Identify deduct step (step 2 right after deposit)
  let deductIndex = items.findIndex(
    (it, idx) =>
      it.deductDeposit ||
      (depositIndex >= 0 && idx === depositIndex + 1)
  )

  let cumulative = 0
  let actualDepositPaid = 0

  const installments: PaymentInstallment[] = items.map((item, idx) => {
    let amount = 0
    const pct = item.percentage ?? 0

    if (idx === depositIndex) {
      // Step 1: Deposit step
      if (item.fixedAmount != null) {
        actualDepositPaid = item.fixedAmount
      } else if (unit) {
        actualDepositPaid = getUnitDeposit(unit)
      } else if (pct > 0) {
        actualDepositPaid = Math.round((price * pct) / 100)
      } else {
        actualDepositPaid = getUnitDeposit(unit)
      }
      actualDepositPaid = Math.min(price, actualDepositPaid)
      amount = actualDepositPaid
    } else if (idx === deductIndex && depositIndex >= 0) {
      // Step 2: Target cumulative percentage minus deposit paid
      const step1Pct = items[depositIndex].percentage ?? 0
      const targetPct = step1Pct === 0 ? pct : step1Pct + pct
      const targetAmount = Math.round((price * targetPct) / 100)
      amount = Math.max(0, targetAmount - actualDepositPaid)
    } else {
      amount = item.fixedAmount ?? Math.round((price * pct) / 100)
    }

    cumulative += amount
    const remaining = Math.max(0, price - cumulative)

    return {
      name: item.name,
      percentage: pct,
      amount,
      dueDateNote: item.dueDateNote ?? '',
      cumulativeAmount: cumulative,
      remainingAmount: remaining,
      isDeposit: idx === depositIndex,
    }
  })

  // Reconcile any rounding drift on the last installment to ensure cumulative === price
  if (installments.length > 0) {
    const diff = price - cumulative
    if (Math.abs(diff) > 0 && Math.abs(diff) < 1000) {
      const last = installments[installments.length - 1]
      last.amount += diff
      last.cumulativeAmount += diff
      last.remainingAmount = 0
      cumulative = price
    }
  }

  return {
    installments,
    totalAmount: cumulative,
    totalPercentage: 100,
    depositAmount: actualDepositPaid || depositAmount,
    isValid: true,
  }
}
