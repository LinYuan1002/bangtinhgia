// ─────────────────────────────────────────────────────────────
// POLICY ENGINE (BỘ QUẢN LÝ CHÍNH SÁCH BÁN HÀNG THEO TÒA)
// Hierarchy: PROJECT → POLICY VERSION → BUILDING → UNIT TYPE → UNIT
// ─────────────────────────────────────────────────────────────

import { PolicyVersion } from './types'

export const OFFICIAL_POLICIES: PolicyVersion[] = [
  // ───────────────────────────────────────────────────────────
  // A. CSƯĐ13 — Áp dụng P10, P11, P16, P18 (Từ 10/07/2026)
  // Đơn giá hoàn thiện: CHƯA GỒM VAT
  // Vay: Tối đa 70% Giá căn hộ thô gồm VAT
  // ───────────────────────────────────────────────────────────
  {
    id: 'csud13-v1',
    policyCode: 'CSUD13',
    policyName: 'Chính sách bán hàng CSƯĐ13',
    version: '1.0',
    effectiveFrom: '2026-07-10',
    buildings: ['P10', 'P11', 'P16', 'P18'],
    description: 'Áp dụng cho các tòa P10, P11, P16, P18 từ 10/07/2026. Đơn giá hoàn thiện chưa gồm VAT.',
    status: 'ACTIVE',
    vatRate: 0.10,
    rawPriceIncludesVAT: true,
    completionPriceIncludesVAT: false,
    completionRates: {
      STUDIO: 4_722_222,
      '1BR_PLUS': 4_259_259,
      '2BR': 5_000_000,
      '3BR': 5_000_000,
    },
    kpbtType: 'PERCENTAGE',
    kpbtRate: 0.02,
    kpbtIncludedInPrice: true,
    noLoanDiscount: {
      enabled: true,
      rate: 0.05,
      basis: 'RAW_PRICE_EXCL_VAT',
    },
    earlyPaymentRules: [
      { paymentPercent: 95, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.090, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 95, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.085, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.060, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.055, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.030, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.025, basis: 'RAW_PRICE_EXCL_VAT' },
    ],
    earlyPaymentInterestRate: 0.08,
    earlyKeyEligible: false,
    loanRules: {
      maxLoanPercent: 70,
      loanBasis: 'RAW_PRICE_INCL_VAT',
      supportRate: 0,
      supportPeriodMonths: 18,
    },
    paymentMilestones: [],
    roundingMode: 'ROUND',
    roundingUnit: 1,
  },

  // ───────────────────────────────────────────────────────────
  // B. CSƯĐ14 — Áp dụng P3, P4, P5, P6, P8, P9 (Từ 29/07/2026)
  // Đơn giá hoàn thiện: ĐÃ GỒM VAT
  // Vay: Tối đa 70% Giá căn hộ thô gồm VAT
  // ───────────────────────────────────────────────────────────
  {
    id: 'csud14-v1',
    policyCode: 'CSUD14',
    policyName: 'Chính sách bán hàng CSƯĐ14',
    version: '1.0',
    effectiveFrom: '2026-07-29',
    buildings: ['P3', 'P4', 'P5', 'P6', 'P8', 'P9'],
    description: 'Áp dụng cho các tòa P3, P4, P5, P6, P8, P9 từ 29/07/2026. Đơn giá hoàn thiện đã gồm VAT.',
    status: 'ACTIVE',
    vatRate: 0.10,
    rawPriceIncludesVAT: true,
    completionPriceIncludesVAT: true,
    completionRates: {
      STUDIO: 5_100_000,
      '1BR_PLUS': 4_600_000,
      '2BR': 5_400_000,
      '3BR': 5_400_000,
    },
    kpbtType: 'PERCENTAGE',
    kpbtRate: 0.02,
    kpbtIncludedInPrice: true,
    noLoanDiscount: {
      enabled: true,
      rate: 0.05,
      basis: 'RAW_PRICE_EXCL_VAT',
    },
    earlyPaymentRules: [
      { paymentPercent: 95, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.120, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 95, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.110, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.095, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.090, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.075, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.070, basis: 'RAW_PRICE_EXCL_VAT' },
    ],
    earlyPaymentInterestRate: 0.08,
    earlyKeyEligible: false,
    loanRules: {
      maxLoanPercent: 70,
      loanBasis: 'RAW_PRICE_INCL_VAT',
      supportRate: 0,
      supportPeriodMonths: 18,
    },
    paymentMilestones: [],
    roundingMode: 'ROUND',
    roundingUnit: 1,
  },

  // ───────────────────────────────────────────────────────────
  // C. CSƯĐ16 — Áp dụng P24, P25, P26 (Từ 10/07/2026)
  // Có Sun Early Key (TT >= 70% nhận bàn giao sớm)
  // Vay: Tối đa 70% Tổng giá bán gồm VAT
  // ───────────────────────────────────────────────────────────
  {
    id: 'csud16-v1',
    policyCode: 'CSUD16',
    policyName: 'Chính sách bán hàng CSƯĐ16',
    version: '1.0',
    effectiveFrom: '2026-07-10',
    buildings: ['P24', 'P25', 'P26'],
    description: 'Áp dụng cho các tòa P24, P25, P26 từ 10/07/2026. Có ưu đãi nhận bàn giao sớm Sun Early Key.',
    status: 'ACTIVE',
    vatRate: 0.10,
    rawPriceIncludesVAT: true,
    completionPriceIncludesVAT: false,
    completionRates: {
      STUDIO: 4_722_222,
      '1BR_PLUS': 4_259_259,
      '2BR': 5_000_000,
      '3BR': 5_000_000,
    },
    kpbtType: 'PERCENTAGE',
    kpbtRate: 0.02,
    kpbtIncludedInPrice: true,
    noLoanDiscount: {
      enabled: true,
      rate: 0.05,
      basis: 'RAW_PRICE_EXCL_VAT',
    },
    earlyPaymentRules: [
      { paymentPercent: 95, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.100, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 95, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.095, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.050, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.045, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.020, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-09-25', deadlineLabel: 'Đến 25/09/2026', discountRate: 0.015, basis: 'RAW_PRICE_EXCL_VAT' },
    ],
    earlyPaymentInterestRate: 0.08,
    earlyKeyEligible: true,
    earlyKeyMinPaymentPercent: 70,
    loanRules: {
      maxLoanPercent: 70,
      loanBasis: 'TOTAL_PRICE_INCL_VAT',
      supportRate: 0,
      supportPeriodMonths: 18,
    },
    paymentMilestones: [],
    roundingMode: 'ROUND',
    roundingUnit: 1,
  },

  // ───────────────────────────────────────────────────────────
  // D. CSƯĐ09 — Áp dụng P7, P15, P19 (Từ 20/06/2026)
  // Có Sun Early Key (TT >= 70% nhận bàn giao sớm)
  // Vay: Tối đa 70% Tổng giá bán gồm VAT
  // ───────────────────────────────────────────────────────────
  {
    id: 'csud09-v1',
    policyCode: 'CSUD09',
    policyName: 'Chính sách bán hàng CSƯĐ09',
    version: '1.0',
    effectiveFrom: '2026-06-20',
    buildings: ['P7', 'P15', 'P19'],
    description: 'Áp dụng cho các tòa P7, P15, P19 từ 20/06/2026. Có ưu đãi nhận bàn giao sớm Sun Early Key.',
    status: 'ACTIVE',
    vatRate: 0.10,
    rawPriceIncludesVAT: true,
    completionPriceIncludesVAT: false,
    completionRates: {
      STUDIO: 4_722_222,
      '1BR_PLUS': 4_259_259,
      '2BR': 5_000_000,
      '3BR': 5_000_000,
    },
    kpbtType: 'PERCENTAGE',
    kpbtRate: 0.02,
    kpbtIncludedInPrice: true,
    noLoanDiscount: {
      enabled: true,
      rate: 0.05,
      basis: 'RAW_PRICE_EXCL_VAT',
    },
    earlyPaymentRules: [
      { paymentPercent: 95, deadline: '2026-06-25', deadlineLabel: 'Đến 25/06/2026', discountRate: 0.120, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 95, deadline: '2026-07-25', deadlineLabel: 'Đến 25/07/2026', discountRate: 0.115, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-06-25', deadlineLabel: 'Đến 25/06/2026', discountRate: 0.070, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-07-25', deadlineLabel: 'Đến 25/07/2026', discountRate: 0.065, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-06-25', deadlineLabel: 'Đến 25/06/2026', discountRate: 0.040, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-07-25', deadlineLabel: 'Đến 25/07/2026', discountRate: 0.035, basis: 'RAW_PRICE_EXCL_VAT' },
    ],
    earlyPaymentInterestRate: 0.08,
    earlyKeyEligible: true,
    earlyKeyMinPaymentPercent: 70,
    loanRules: {
      maxLoanPercent: 70,
      loanBasis: 'TOTAL_PRICE_INCL_VAT',
      supportRate: 0,
      supportPeriodMonths: 18,
    },
    paymentMilestones: [],
    roundingMode: 'ROUND',
    roundingUnit: 1,
  },

  // ───────────────────────────────────────────────────────────
  // E. QUỸ ĐỘC QUYỀN TÒA P12
  // ───────────────────────────────────────────────────────────
  {
    id: 'csud-p12-v1',
    policyCode: 'CSUD_P12',
    policyName: 'Chính sách Quỹ Độc Quyền Tòa P12',
    version: '1.0',
    effectiveFrom: '2026-05-01',
    buildings: ['P12'],
    description: 'Chính sách đặc quyền dành riêng cho quỹ căn Tòa P12',
    status: 'ACTIVE',
    vatRate: 0.10,
    rawPriceIncludesVAT: true,
    completionPriceIncludesVAT: false,
    completionRates: {
      STUDIO: 0,
      '1BR_PLUS': 0,
      '2BR': 0,
      '3BR': 0,
    },
    kpbtType: 'PERCENTAGE',
    kpbtRate: 0.02,
    kpbtIncludedInPrice: true,
    noLoanDiscount: {
      enabled: true,
      rate: 0.05,
      basis: 'RAW_PRICE_EXCL_VAT',
    },
    earlyPaymentRules: [
      { paymentPercent: 95, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.095, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 70, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.045, basis: 'RAW_PRICE_EXCL_VAT' },
      { paymentPercent: 50, deadline: '2026-08-25', deadlineLabel: 'Đến 25/08/2026', discountRate: 0.015, basis: 'RAW_PRICE_EXCL_VAT' },
    ],
    earlyPaymentInterestRate: 0.08,
    earlyKeyEligible: false,
    loanRules: {
      maxLoanPercent: 70,
      loanBasis: 'RAW_PRICE_INCL_VAT',
      supportRate: 0,
      supportPeriodMonths: 18,
    },
    paymentMilestones: [],
    roundingMode: 'ROUND',
    roundingUnit: 1,
  },
]

/**
 * Returns all active or defined policies
 */
export function getAllPolicies(): PolicyVersion[] {
  return OFFICIAL_POLICIES
}

/**
 * Find policy by exact code
 */
export function getPolicyByCode(code: string): PolicyVersion | undefined {
  return OFFICIAL_POLICIES.find((p) => p.policyCode.toUpperCase() === code.toUpperCase())
}

/**
 * Normalizes building name/code to standard uppercase (e.g. "p10" -> "P10", "Tòa P14" -> "P14")
 */
export function normalizeBuildingCode(building: string): string {
  const s = String(building || '').trim().toUpperCase()
  const match = s.match(/P\s*(\d+)/)
  if (match) {
    return `P${match[1]}`
  }
  return s
}

/**
 * Resolves the active policy version for a given building and calculation date.
 * If multiple versions apply, picks the latest effective version.
 */
export function resolveActivePolicy(
  building: string,
  calculationDate?: string
): PolicyVersion {
  const normBuilding = normalizeBuildingCode(building)
  const calcTime = calculationDate ? new Date(calculationDate).getTime() : Date.now()

  // Find all policies that include this building
  const matchingPolicies = OFFICIAL_POLICIES.filter((p) => {
    if (p.status === 'ARCHIVED') return false
    const matchBuilding = p.buildings.some(
      (b) => normalizeBuildingCode(b) === normBuilding
    )
    if (!matchBuilding) return false

    // Check effective dates
    const effectiveFromTime = new Date(p.effectiveFrom).getTime()
    if (calcTime < effectiveFromTime) return false

    if (p.effectiveTo) {
      const effectiveToTime = new Date(p.effectiveTo).getTime()
      if (calcTime > effectiveToTime) return false
    }

    return true
  })

  if (matchingPolicies.length > 0) {
    // Sort descending by effectiveFrom to get the latest policy version
    matchingPolicies.sort(
      (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    )
    return matchingPolicies[0]
  }

  // Fallback: match by building regardless of date
  const fallbackByBuilding = OFFICIAL_POLICIES.find((p) =>
    p.buildings.some((b) => normalizeBuildingCode(b) === normBuilding)
  )
  if (fallbackByBuilding) {
    return fallbackByBuilding
  }

  // Default fallback to CSUD14 or first policy
  return OFFICIAL_POLICIES[1] || OFFICIAL_POLICIES[0]
}
