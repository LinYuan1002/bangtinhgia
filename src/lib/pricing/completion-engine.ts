// ─────────────────────────────────────────────────────────────
// COMPLETION VALUE (GIÁ TRỊ HOÀN THIỆN) ENGINE
// Configurable per policy and unit type
// Explicitly handles: completionPriceIncludesVAT: true vs false
// ─────────────────────────────────────────────────────────────

import { PolicyVersion, UnitData, UnitType } from './types'
import { roundMoney } from './rounding'
import { normalizeUnitType } from './validators'

export interface CompletionResult {
  unitType: UnitType
  ratePerM2: number
  completionNet: number   // Giá trị hoàn thiện chưa VAT
  completionVAT: number   // VAT của phần hoàn thiện
  completionGross: number // Giá trị hoàn thiện gồm VAT
  priceIncludesVAT: boolean
}

export function calculateCompletionValue(
  unit: UnitData,
  policy: PolicyVersion
): CompletionResult {
  const normType = normalizeUnitType(unit.unitType)
  const rate = policy.completionRates?.[normType] || 0
  const vatRate = policy.vatRate ?? 0.10
  const netArea = unit.netArea || 0
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'

  let completionNet = 0
  let completionVAT = 0
  let completionGross = 0

  if (policy.completionPriceIncludesVAT) {
    // Trường hợp CSƯĐ14: Đơn giá hoàn thiện ĐÃ GỒM VAT
    completionGross = roundMoney(netArea * rate, roundingUnit, roundingMode)
    completionNet = roundMoney(completionGross / (1 + vatRate), roundingUnit, roundingMode)
    completionVAT = completionGross - completionNet
  } else {
    // Trường hợp CSƯĐ13: Đơn giá hoàn thiện CHƯA GỒM VAT
    completionNet = roundMoney(netArea * rate, roundingUnit, roundingMode)
    completionVAT = roundMoney(completionNet * vatRate, roundingUnit, roundingMode)
    completionGross = completionNet + completionVAT
  }

  return {
    unitType: normType,
    ratePerM2: rate,
    completionNet,
    completionVAT,
    completionGross,
    priceIncludesVAT: policy.completionPriceIncludesVAT,
  }
}
