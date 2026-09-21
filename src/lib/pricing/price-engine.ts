// ─────────────────────────────────────────────────────────────
// RAW APARTMENT PRICE ENGINE
// Explicit separation: rawPriceNet, rawPriceVAT, rawPriceGross
// Dynamic VAT rate from policy configuration
// ─────────────────────────────────────────────────────────────

import { PolicyVersion, UnitData } from './types'
import { roundMoney } from './rounding'

export interface RawPriceResult {
  rawPriceNet: number           // Giá trị căn hộ thô chưa VAT & KPBT
  rawPriceVAT: number           // VAT của giá trị căn hộ thô
  rawPriceGrossExclKPBT: number // Giá căn hộ thô gồm VAT (chưa gồm KPBT - Giá HĐMB gốc)
  kpbt: number                  // Kinh phí bảo trì (2%)
  rawPriceGross: number         // Giá niêm yết gồm VAT & KPBT (hoặc gồm VAT)
  vatRate: number
  kpbtRate: number
}

export function calculateRawPrice(
  unit: UnitData,
  policy: PolicyVersion
): RawPriceResult {
  const vatRate = policy.vatRate ?? 0.10
  const kpbtRate = policy.kpbtRate ?? 0.02
  const roundingUnit = policy.roundingUnit || 1
  const roundingMode = policy.roundingMode || 'ROUND'

  let rawPriceNet = 0
  let rawPriceVAT = 0
  let rawPriceGrossExclKPBT = 0
  let kpbt = 0
  let rawPriceGross = 0

  if (policy.rawPriceIncludesVAT) {
    rawPriceGross = Math.round(unit.basePrice)
    const factor = policy.kpbtIncludedInPrice ? (1 + vatRate + kpbtRate) : (1 + vatRate)
    rawPriceNet = roundMoney(rawPriceGross / factor, roundingUnit, roundingMode)
    rawPriceVAT = roundMoney(rawPriceNet * vatRate, roundingUnit, roundingMode)
    kpbt = policy.kpbtIncludedInPrice
      ? (rawPriceGross - rawPriceNet - rawPriceVAT)
      : roundMoney(rawPriceNet * kpbtRate, roundingUnit, roundingMode)
    rawPriceGrossExclKPBT = rawPriceNet + rawPriceVAT
  } else {
    rawPriceNet = Math.round(unit.basePrice)
    rawPriceVAT = roundMoney(rawPriceNet * vatRate, roundingUnit, roundingMode)
    kpbt = roundMoney(rawPriceNet * kpbtRate, roundingUnit, roundingMode)
    rawPriceGrossExclKPBT = rawPriceNet + rawPriceVAT
    rawPriceGross = rawPriceGrossExclKPBT + (policy.kpbtIncludedInPrice ? kpbt : 0)
  }

  return {
    rawPriceNet,
    rawPriceVAT,
    rawPriceGrossExclKPBT,
    kpbt,
    rawPriceGross,
    vatRate,
    kpbtRate,
  }
}
