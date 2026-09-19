// ─────────────────────────────────────────
// DISCOUNT CALCULATION ENGINE
// STACKED vs SEQUENTIAL pure functions
// ─────────────────────────────────────────

export type DiscountCalculationMode = 'STACKED' | 'SEQUENTIAL'

export interface DiscountEntry {
  key: string
  name: string
  percent?: number     // e.g. 5 for 5%
  fixedAmount?: number // VND
}

export interface DiscountStepResult {
  key: string
  name: string
  appliedOnPrice: number // Giá làm căn cứ tính chiết khấu
  percent: number
  amount: number
  priceAfterDiscount: number // Giá còn lại sau khi trừ
}

export interface DiscountCalculationOutput {
  basePrice: number
  mode: DiscountCalculationMode
  steps: DiscountStepResult[]
  totalDiscount: number
  finalPrice: number
}

/**
 * STACKED MODE:
 * Tất cả chiết khấu % đều tính trên GIÁ GỐC ban đầu.
 * Giá cuối = Giá gốc - Sum(Tất cả chiết khấu)
 */
export function calculateStackedDiscount(
  basePrice: number,
  discounts: DiscountEntry[]
): DiscountCalculationOutput {
  let totalDiscount = 0
  const steps: DiscountStepResult[] = []

  for (const d of discounts) {
    const pct = d.percent ?? 0
    // Always applied on the original basePrice
    const amount = d.fixedAmount ?? (basePrice * pct) / 100
    totalDiscount += amount

    steps.push({
      key: d.key,
      name: d.name,
      appliedOnPrice: basePrice,
      percent: pct,
      amount,
      priceAfterDiscount: basePrice - totalDiscount,
    })
  }

  const finalPrice = Math.max(0, basePrice - totalDiscount)

  return {
    basePrice,
    mode: 'STACKED',
    steps,
    totalDiscount,
    finalPrice,
  }
}

/**
 * SEQUENTIAL MODE:
 * Chiết khấu đầu tiên tính trên Giá gốc.
 * Chiết khấu tiếp theo tính trên GIÁ CÒN LẠI sau khi trừ chiết khấu trước.
 */
export function calculateSequentialDiscount(
  basePrice: number,
  discounts: DiscountEntry[]
): DiscountCalculationOutput {
  let remainingPrice = basePrice
  let totalDiscount = 0
  const steps: DiscountStepResult[] = []

  for (const d of discounts) {
    const appliedOn = remainingPrice
    const pct = d.percent ?? 0
    const amount = d.fixedAmount ?? (remainingPrice * pct) / 100
    remainingPrice = Math.max(0, remainingPrice - amount)
    totalDiscount += amount

    steps.push({
      key: d.key,
      name: d.name,
      appliedOnPrice: appliedOn,
      percent: pct,
      amount,
      priceAfterDiscount: remainingPrice,
    })
  }

  return {
    basePrice,
    mode: 'SEQUENTIAL',
    steps,
    totalDiscount,
    finalPrice: remainingPrice,
  }
}
