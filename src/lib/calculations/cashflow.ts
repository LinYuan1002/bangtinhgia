// ─────────────────────────────────────────
// CASH FLOW CALCULATION ENGINE
// Tính vốn tự có cần chuẩn bị
// ─────────────────────────────────────────

export interface CashflowItem {
  label: string
  amount: number
  type: 'REQUIRED' | 'SUPPORT' // REQUIRED = phải có, SUPPORT = được hỗ trợ (trừ đi)
}

export interface CashflowInput {
  finalPrice: number
  equityAmount: number        // Vốn tự có = finalPrice - loanAmount
  preDisbursePayments: {      // Các đợt TT trước khi ngân hàng giải ngân
    name: string
    amount: number
  }[]
  fees?: {                    // Phí phát sinh
    name: string
    amount: number
  }[]
  supports?: {                // Hỗ trợ / ưu đãi (trừ vào tổng)
    name: string
    amount: number
  }[]
}

export interface CashflowResult {
  items: CashflowItem[]
  totalRequired: number       // Tổng vốn phải có
  totalSupport: number        // Tổng ưu đãi / hỗ trợ
  netCashRequired: number     // Thực tế cần chuẩn bị = totalRequired - totalSupport
}

/**
 * Calculate initial cash required before bank disbursement.
 * Breaks down every component clearly.
 */
export function calculateInitialCashRequired(input: CashflowInput): CashflowResult {
  const items: CashflowItem[] = []

  // Vốn tự có (equity)
  items.push({
    label: 'Vốn tự có (không vay)',
    amount: input.equityAmount,
    type: 'REQUIRED',
  })

  // Các đợt thanh toán trước giải ngân
  for (const payment of input.preDisbursePayments) {
    items.push({
      label: payment.name,
      amount: payment.amount,
      type: 'REQUIRED',
    })
  }

  // Phí phát sinh
  for (const fee of input.fees ?? []) {
    items.push({
      label: fee.name,
      amount: fee.amount,
      type: 'REQUIRED',
    })
  }

  // Hỗ trợ (trừ vào tổng)
  for (const support of input.supports ?? []) {
    items.push({
      label: support.name,
      amount: support.amount,
      type: 'SUPPORT',
    })
  }

  const totalRequired = items
    .filter((i) => i.type === 'REQUIRED')
    .reduce((s, i) => s + i.amount, 0)

  const totalSupport = items
    .filter((i) => i.type === 'SUPPORT')
    .reduce((s, i) => s + i.amount, 0)

  return {
    items,
    totalRequired,
    totalSupport,
    netCashRequired: totalRequired - totalSupport,
  }
}
