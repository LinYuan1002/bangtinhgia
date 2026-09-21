// ─────────────────────────────────────────────────────────────
// RAW APARTMENT PRICE ENGINE
// Explicit separation: rawPriceNet, rawPriceVAT, rawPriceGross
// Dynamic VAT rate from policy configuration
// ─────────────────────────────────────────────────────────────

import { PolicyVersion, UnitData } from './types'
import { roundMoney } from './rounding'

export interface RawPriceResult {
  rawPriceNet: number   // Giá trị căn hộ thô chưa VAT
  rawPriceVAT: number   // VAT của giá trị căn hộ thô
  rawPriceGross: number // Giá trị căn hộ thô gồm VAT
  vatRate: number
}

export function calculateRawPrice(
  unit: UnitData,
  policy: PolicyVersion
): RawPriceResult {
  const vatRate = policy.vatRate ?? 0.10
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'

  let rawPriceNet = 0
  let rawPriceVAT = 0
  let rawPriceGross = 0

  if (policy.rawPriceIncludesVAT) {
    rawPriceGross = Math.round(unit.basePrice)
    rawPriceNet = roundMoney(rawPriceGross / (1 + vatRate), roundingUnit, roundingMode)
    rawPriceVAT = rawPriceGross - rawPriceNet
  } else {
    rawPriceNet = Math.round(unit.basePrice)
    rawPriceVAT = roundMoney(rawPriceNet * vatRate, roundingUnit, roundingMode)
    rawPriceGross = rawPriceNet + rawPriceVAT
  }

  return {
    rawPriceNet,
    rawPriceVAT,
    rawPriceGross,
    vatRate,
  }
}
