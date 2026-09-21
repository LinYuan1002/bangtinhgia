// ─────────────────────────────────────────────────────────────
// REAL ESTATE PRICING ENGINE — DATA TYPES & INTERFACES
// Hierarchy:
// PROJECT → POLICY VERSION → BUILDING → UNIT TYPE → UNIT →
// PRICE CONFIG → DISCOUNT CONFIG → PAYMENT PLAN → CALCULATION RESULT
// ─────────────────────────────────────────────────────────────

export type UnitType = 'STUDIO' | '1BR_PLUS' | '2BR' | '3BR'

export interface UnitData {
  id: string
  building: string
  floor: number
  unitNumber: string
  unitType: UnitType
  netArea: number        // Diện tích thông thủy (m²)
  grossArea?: number     // Diện tích tim tường (nếu có)
  basePrice: number      // Giá niêm yết (VNĐ)
  pricePerM2?: number    // Đơn giá / m²
  status?: string        // AVAILABLE | HOLD | SOLD | LOCKED
  direction?: string
  view?: string
  imageUrl?: string | null
  notes?: string
}

export interface EarlyPaymentRule {
  paymentPercent: number // 50, 70, 95 (%)
  deadline: string       // YYYY-MM-DD, e.g. "2026-08-25", "2026-09-25"
  deadlineLabel?: string // e.g. "Đến 25/08/2026"
  discountRate: number   // 0.09 = 9.0%
  basis: 'RAW_PRICE_EXCL_VAT' | 'RAW_PRICE_INCL_VAT'
  conditions?: string
}

export type PaymentOption = 'NO_LOAN' | 'LOAN' | 'EARLY_PAYMENT' | 'STANDARD'

export interface PaymentMilestoneTemplate {
  sequence: number
  label: string
  dueDateRule: string    // "Ngay khi ký TTĐC", "T+15 ngày", "25/08/2026", "Bàn giao"
  percentage: number     // e.g. 15 for 15%
  percentageBasis?: 'TOTAL_CONTRACT' | 'RAW_PRICE' | 'COMPLETION'
  fixedAmount?: number   // if specified (e.g. deposit by unit type)
  isDeposit?: boolean
  deductDeposit?: boolean
  vatIncluded?: boolean
  completionIncluded?: boolean
  kpbtIncluded?: boolean
  loanEligible?: boolean
  notes?: string
}

export interface PolicyVersion {
  id: string
  policyCode: 'CSUD13' | 'CSUD14' | 'CSUD16' | 'CSUD09' | string
  policyName: string
  version: string        // e.g. "v1.0"
  effectiveFrom: string  // YYYY-MM-DD
  effectiveTo?: string   // YYYY-MM-DD
  buildings: string[]    // list of building codes e.g. ['P10', 'P11', 'P16', 'P18']
  description?: string
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

  // VAT Configuration
  vatRate: number        // e.g. 0.10 (10%) or 0.08 (8%)
  rawPriceIncludesVAT: boolean

  // Completion Configuration
  completionRates: Record<UnitType, number> // VND / m² (calculated on netArea)
  completionPriceIncludesVAT: boolean       // true for CSƯĐ14, false for CSƯĐ13

  // KPBT (Kinh phí bảo trì)
  kpbtType: 'PERCENTAGE' | 'FIXED' | 'MANUAL'
  kpbtRate?: number      // e.g. 0.02 (2%)
  kpbtValue?: number     // fixed VND if kpbtType === 'FIXED'
  kpbtIncludedInPrice: boolean

  // Discount Configurations
  noLoanDiscount: {
    enabled: boolean
    rate: number         // e.g. 0.05 (5%)
    basis: 'RAW_PRICE_EXCL_VAT' | 'RAW_PRICE_INCL_VAT'
  }

  earlyPaymentRules: EarlyPaymentRule[]
  earlyPaymentInterestRate: number // default 0.08 (8%/year)

  // Special Benefits / Flags
  earlyKeyEligible?: boolean       // true for CSƯĐ09 and CSƯĐ16 (TT >= 70% nhận nhà sớm)
  earlyKeyMinPaymentPercent?: number // 70%

  // Loan Configuration
  loanRules: {
    maxLoanPercent: number         // default 70
    loanBasis: 'RAW_PRICE_INCL_VAT' | 'TOTAL_PRICE_INCL_VAT'
    supportRate: number            // 0% during support period
    supportPeriodMonths: number    // e.g. 18 months
  }

  // Payment Milestone Templates
  paymentMilestones: PaymentMilestoneTemplate[]

  // Rounding Configuration
  roundingMode: 'ROUND' | 'FLOOR' | 'CEIL'
  roundingUnit: number             // 1 = VND, 1000 = ngàn đồng, 10000 = chục ngàn
}

export interface CalculationInput {
  unit: UnitData
  policy?: PolicyVersion
  calculationDate?: string         // default current date YYYY-MM-DD
  paymentOption: PaymentOption
  earlyPaymentPercent?: number     // 50, 70, 95
  earlyPaymentDeadline?: string    // YYYY-MM-DD
  actualPaymentDate?: string       // for calculating early payment interest (>= 10 days)
  scheduledDueDate?: string
  loanPercent?: number             // e.g. 70
  annualInterestRate?: number      // e.g. 8.5
  loanTermMonths?: number          // e.g. 240
  customDiscounts?: {
    name: string
    amount: number
    rate?: number
  }[]
}

export interface BreakdownItem {
  key: string
  label: string
  amount: number
  formattedAmount: string
  formulaExplanation: string
  category: 'RAW_PRICE' | 'COMPLETION' | 'TAX_FEE' | 'DISCOUNT' | 'FINAL' | 'FINANCING' | 'BENEFIT'
}

export interface PaymentScheduleItemResult {
  sequence: number
  label: string
  percentage: number
  amount: number
  cumulativeAmount: number
  cumulativePercent: number
  remainingAmount: number
  dueDateNote: string
  isDeposit?: boolean
  notes?: string
}

export interface CalculationResult {
  // Policy & Unit Snapshot Metadata
  policyCode: string
  policyName: string
  policyVersion: string
  policyEffectiveDate: string
  building: string
  unitNumber: string
  unitType: UnitType
  netArea: number

  // A. Giá trị căn hộ thô
  rawPriceNet: number
  rawPriceVAT: number
  rawPriceGross: number

  // B. Giá trị hoàn thiện
  completionRate: number
  completionNet: number
  completionVAT: number
  completionGross: number

  // C. KPBT
  kpbt: number
  hasKpbtData: boolean
  kpbtNote?: string

  // D. Tổng trước ưu đãi
  subtotalGross: number

  // E. Chiết khấu & Ưu đãi
  noLoanDiscount: number
  earlyPaymentDiscount: number
  otherDiscounts: number
  totalDiscount: number

  // F. Tổng giá trị hợp đồng
  finalPrice: number

  // G. Vay ngân hàng & Vốn tự có
  loanBasis: string
  loanAmount: number
  equityAmount: number
  totalCashRequired: number

  // H. Lợi ích thanh toán sớm & Sun Early Key
  earlyPaymentInterest: number
  earlyDays?: number
  earlyKeyEligible: boolean
  earlyKeyQualified: boolean
  totalBenefits: number

  // I. Bảng tiến độ thanh toán
  paymentSchedule: PaymentScheduleItemResult[]

  // J. Bảng phân tích chi tiết kèm công thức và tooltip
  calculationBreakdown: BreakdownItem[]
}
