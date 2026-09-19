// ─────────────────────────────────────────
// QUOTE SNAPSHOT BUILDER
// Builds immutable snapshot objects for Quote records
// ─────────────────────────────────────────

import { PriceResult } from './price'
import { PaymentScheduleResult } from './payment'
import { LoanResult } from './loan'

export interface CreateQuoteInput {
  unit: {
    id: string
    unitCode: string
    buildingCode: string
    floorNumber: number
    unitTypeName: string
    area: number
    direction?: string
    view?: string
    basePrice: number
    pricePerM2?: number
    status?: string
    imageUrl?: string | null
  }
  policy?: {
    id: string
    name: string
    description?: string | null
    discountPercent?: number
    fixedDiscount?: number
    earlyPaymentDiscountPct?: number
    earlyPaymentDiscount?: number
    specialDiscount?: number
    giftValue?: number
    discountMode?: string
  } | null
  paymentPlan?: {
    id: string
    name: string
    type: string
  } | null
  priceResult: PriceResult
  paymentScheduleResult?: PaymentScheduleResult | null
  loanResult?: LoanResult | null
  customer: {
    name?: string
    phone?: string
    email?: string
  }
  sales: {
    name?: string
    phone?: string
  }
}

export interface QuoteSnapshotPayload {
  unitId: string
  policyId?: string
  paymentPlanId?: string
  unitSnapshot: object
  policySnapshot?: object | null
  calculationSnapshot: object
  paymentSnapshot?: object | null
  loanSnapshot?: object | null
  snapshotPrice: number
  totalDiscount: number
  finalPrice: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  salesName?: string
  salesPhone?: string
}

/**
 * Build a complete, immutable snapshot payload ready to be saved to DB.
 */
export function buildQuoteSnapshot(input: CreateQuoteInput): QuoteSnapshotPayload {
  const {
    unit,
    policy,
    paymentPlan,
    priceResult,
    paymentScheduleResult,
    loanResult,
    customer,
    sales,
  } = input

  return {
    unitId: unit.id,
    policyId: policy?.id,
    paymentPlanId: paymentPlan?.id,
    unitSnapshot: {
      id: unit.id,
      unitCode: unit.unitCode,
      buildingCode: unit.buildingCode,
      floorNumber: unit.floorNumber,
      unitTypeName: unit.unitTypeName,
      area: unit.area,
      direction: unit.direction,
      view: unit.view,
      basePrice: unit.basePrice,
      pricePerM2: unit.pricePerM2,
      status: unit.status,
      imageUrl: unit.imageUrl,
    },
    policySnapshot: policy
      ? {
          id: policy.id,
          name: policy.name,
          description: policy.description,
          discountPercent: policy.discountPercent,
          fixedDiscount: policy.fixedDiscount,
          earlyPaymentDiscountPct: policy.earlyPaymentDiscountPct,
          earlyPaymentDiscount: policy.earlyPaymentDiscount,
          specialDiscount: policy.specialDiscount,
          giftValue: policy.giftValue,
          discountMode: policy.discountMode,
        }
      : null,
    calculationSnapshot: {
      basePrice: priceResult.basePrice,
      percentageDiscountAmount: priceResult.percentageDiscountAmount,
      fixedDiscountAmount: priceResult.fixedDiscountAmount,
      earlyPaymentDiscountAmount: priceResult.earlyPaymentDiscountAmount,
      specialDiscountAmount: priceResult.specialDiscountAmount,
      totalDiscount: priceResult.totalDiscount,
      finalPrice: priceResult.finalPrice,
      originalPricePerM2: priceResult.originalPricePerM2,
      finalPricePerM2: priceResult.finalPricePerM2,
      discountCalculationMode: priceResult.discountCalculationMode,
      discountBreakdown: priceResult.discountBreakdown,
    },
    paymentSnapshot: paymentScheduleResult
      ? {
          totalAmount: paymentScheduleResult.totalAmount,
          totalPercentage: paymentScheduleResult.totalPercentage,
          installments: paymentScheduleResult.installments.map((i) => ({
            name: i.name,
            percentage: i.percentage,
            amount: i.amount,
            dueDateNote: i.dueDateNote,
            cumulativeAmount: i.cumulativeAmount,
            remainingAmount: i.remainingAmount,
          })),
        }
      : null,
    loanSnapshot: loanResult
      ? {
          principal: loanResult.principal,
          annualInterestRate: loanResult.annualInterestRate,
          loanTermMonths: loanResult.loanTermMonths,
          repaymentMethod: loanResult.repaymentMethod,
          monthlyPayment: loanResult.monthlyPayment,
          totalPrincipal: loanResult.totalPrincipal,
          totalInterest: loanResult.totalInterest,
          totalPayment: loanResult.totalPayment,
        }
      : null,
    snapshotPrice: priceResult.basePrice,
    totalDiscount: priceResult.totalDiscount,
    finalPrice: priceResult.finalPrice,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    salesName: sales.name,
    salesPhone: sales.phone,
  }
}
