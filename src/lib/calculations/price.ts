// ─────────────────────────────────────────
// PRICE CALCULATION ENGINE
// Pure functions — deterministic, no rounding in intermediate steps
// ─────────────────────────────────────────

import {
  calculateStackedDiscount,
  calculateSequentialDiscount,
  DiscountEntry,
  DiscountCalculationMode,
} from './discount'

export interface PriceInput {
  basePrice: number
  area: number

  percentageDiscount?: number      // e.g. 5 for 5%
  fixedDiscount?: number           // VND
  earlyPaymentDiscount?: number     // VND hoặc % (nếu <= 100 coi là %, > 100 coi là VND)
  specialDiscount?: number          // VND

  discountCalculationMode?: DiscountCalculationMode
}

export interface PriceResult {
  basePrice: number

  percentageDiscountAmount: number
  fixedDiscountAmount: number
  earlyPaymentDiscountAmount: number
  specialDiscountAmount: number

  totalDiscount: number

  finalPrice: number

  originalPricePerM2: number
  finalPricePerM2: number

  // Detailed breakdown for display/snapshot
  discountCalculationMode: DiscountCalculationMode
  discountBreakdown: {
    label: string
    percent: number
    amount: number
  }[]
}

/**
 * Main price calculation function.
 * Không làm tròn tiền trong từng bước trung gian.
 * Hỗ trợ STACKED và SEQUENTIAL discount modes.
 */
export function calculatePrice(input: PriceInput): PriceResult {
  const {
    basePrice,
    area,
    percentageDiscount = 0,
    fixedDiscount = 0,
    earlyPaymentDiscount = 0,
    specialDiscount = 0,
    discountCalculationMode = 'STACKED',
  } = input

  // Normalize discounts into ordered entries
  const discountEntries: DiscountEntry[] = []

  if (percentageDiscount > 0) {
    discountEntries.push({
      key: 'percentageDiscount',
      name: 'Chiết khấu theo tỷ lệ',
      percent: percentageDiscount,
    })
  }

  if (fixedDiscount > 0) {
    discountEntries.push({
      key: 'fixedDiscount',
      name: 'Chiết khấu cố định',
      fixedAmount: fixedDiscount,
    })
  }

  if (earlyPaymentDiscount > 0) {
    // If <= 100, treated as percentage; otherwise fixed amount
    if (earlyPaymentDiscount <= 100) {
      discountEntries.push({
        key: 'earlyPaymentDiscount',
        name: 'Chiết khấu thanh toán sớm',
        percent: earlyPaymentDiscount,
      })
    } else {
      discountEntries.push({
        key: 'earlyPaymentDiscount',
        name: 'Chiết khấu thanh toán sớm',
        fixedAmount: earlyPaymentDiscount,
      })
    }
  }

  if (specialDiscount > 0) {
    discountEntries.push({
      key: 'specialDiscount',
      name: 'Chiết khấu đặc biệt',
      fixedAmount: specialDiscount,
    })
  }

  // Calculate based on selected mode
  const calcOutput =
    discountCalculationMode === 'SEQUENTIAL'
      ? calculateSequentialDiscount(basePrice, discountEntries)
      : calculateStackedDiscount(basePrice, discountEntries)

  // Extract individual amounts
  const percentageStep = calcOutput.steps.find((s) => s.key === 'percentageDiscount')
  const fixedStep = calcOutput.steps.find((s) => s.key === 'fixedDiscount')
  const earlyPaymentStep = calcOutput.steps.find((s) => s.key === 'earlyPaymentDiscount')
  const specialStep = calcOutput.steps.find((s) => s.key === 'specialDiscount')

  const percentageDiscountAmount = percentageStep ? percentageStep.amount : 0
  const fixedDiscountAmount = fixedStep ? fixedStep.amount : 0
  const earlyPaymentDiscountAmount = earlyPaymentStep ? earlyPaymentStep.amount : 0
  const specialDiscountAmount = specialStep ? specialStep.amount : 0

  const totalDiscount = calcOutput.totalDiscount
  const finalPrice = calcOutput.finalPrice

  const originalPricePerM2 = area > 0 ? basePrice / area : 0
  const finalPricePerM2 = area > 0 ? finalPrice / area : 0

  return {
    basePrice,
    percentageDiscountAmount,
    fixedDiscountAmount,
    earlyPaymentDiscountAmount,
    specialDiscountAmount,
    totalDiscount,
    finalPrice,
    originalPricePerM2,
    finalPricePerM2,
    discountCalculationMode,
    discountBreakdown: calcOutput.steps.map((s) => ({
      label: s.name,
      percent: s.percent,
      amount: s.amount,
    })),
  }
}

/**
 * Backward compatibility helpers
 */
export function calculateFinalPrice(basePrice: number, policy: any): number {
  if (!policy) return basePrice
  const res = calculatePrice({
    basePrice,
    area: 1,
    percentageDiscount: policy.discountPercent || 0,
    fixedDiscount: policy.fixedDiscount || policy.discountAmount || 0,
    earlyPaymentDiscount: policy.earlyPaymentDiscountPct || policy.earlyPaymentDiscount || 0,
    specialDiscount: policy.specialDiscount || policy.giftValue || 0,
    discountCalculationMode: (policy.discountMode as any) || 'STACKED',
  })
  return res.finalPrice
}

export function calculatePricePerSquareMeter(finalPrice: number, area: number): number {
  return area > 0 ? finalPrice / area : 0
}
