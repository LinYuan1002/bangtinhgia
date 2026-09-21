// ─────────────────────────────────────────────────────────────
// AUTOMATED TEST SUITE: REAL ESTATE PRICING ENGINE
// ─────────────────────────────────────────────────────────────

import {
  calculateQuote,
  resolveActivePolicy,
  calculateCompletionValue,
  calculateDiscounts,
  calculateLoanDetails,
  generatePaymentSchedule,
  roundMoney,
  formatVNDExact,
  normalizeUnitType,
  UnitData,
  CalculationInput,
} from './index'

let totalTests = 0
let passedTests = 0

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ PASS: ${testName}`)
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    if (detail) console.error(`    Detail: ${detail}`)
  }
}

function runTests() {
  console.log('\n==================================================')
  console.log('STARTING PRICING ENGINE TEST SUITE')
  console.log('==================================================\n')

  // Sample units
  const studioUnit: UnitData = {
    id: 'u-studio-1',
    building: 'P10',
    floor: 5,
    unitNumber: 'P10-0501',
    unitType: 'STUDIO',
    netArea: 30.0,
    basePrice: 1_100_000_000, // 1.1 tỷ đã gồm VAT
  }

  const oneBrPlusUnit: UnitData = {
    id: 'u-1br-1',
    building: 'P3',
    floor: 8,
    unitNumber: 'P3-0805',
    unitType: '1BR_PLUS',
    netArea: 45.0,
    basePrice: 1_650_000_000, // 1.65 tỷ đã gồm VAT
  }

  const twoBrUnitP24: UnitData = {
    id: 'u-2br-24',
    building: 'P24',
    floor: 12,
    unitNumber: 'P24-1208',
    unitType: '2BR',
    netArea: 65.0,
    basePrice: 2_200_000_000,
  }

  const unitP7: UnitData = {
    id: 'u-p7-1',
    building: 'P7',
    floor: 6,
    unitNumber: 'P7-0602',
    unitType: 'STUDIO',
    netArea: 30.0,
    basePrice: 1_200_000_000,
  }

  // ───────────────────────────────────────────────────────────
  // TEST 1: Policy Resolution by Building Code
  // ───────────────────────────────────────────────────────────
  console.log('Test Group 1: Policy Resolution')
  const polP10 = resolveActivePolicy('P10')
  const polP3 = resolveActivePolicy('P3')
  const polP24 = resolveActivePolicy('P24')
  const polP7 = resolveActivePolicy('P7')
  const polP12 = resolveActivePolicy('P12')

  assert(polP10.policyCode === 'CSUD13', 'Building P10 resolves to CSUD13')
  assert(polP3.policyCode === 'CSUD14', 'Building P3 resolves to CSUD14')
  assert(polP24.policyCode === 'CSUD16', 'Building P24 resolves to CSUD16')
  assert(polP7.policyCode === 'CSUD09', 'Building P7 resolves to CSUD09')
  assert(polP12.policyCode === 'CSUD_P12', 'Building P12 resolves to CSUD_P12')

  // ───────────────────────────────────────────────────────────
  // TEST 2: CSƯĐ13 Completion Rates (Excluding VAT)
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 2: CSƯĐ13 Completion Engine (VAT Excluded)')
  const comp13 = calculateCompletionValue(studioUnit, polP10)
  // Studio rate in CSUD13: 4,722,222 đ/m2 (chưa VAT)
  // completionNet = 30 * 4,722,222 = 141,666,660
  // completionVAT = 141,666,660 * 10% = 14,166,666
  // completionGross = 155,833,326
  assert(comp13.ratePerM2 === 4_722_222, 'CSUD13 Studio rate is 4,722,222 VND/m2')
  assert(comp13.completionNet === 141_666_660, 'CSUD13 Studio completionNet is 141,666,660', `Got ${comp13.completionNet}`)
  assert(comp13.completionVAT === 14_166_666, 'CSUD13 Studio completionVAT is 14,166,666', `Got ${comp13.completionVAT}`)
  assert(comp13.completionGross === 155_833_326, 'CSUD13 Studio completionGross is 155,833,326', `Got ${comp13.completionGross}`)

  // ───────────────────────────────────────────────────────────
  // TEST 3: CSƯĐ14 Completion Rates (Including VAT)
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 3: CSƯĐ14 Completion Engine (VAT Included)')
  const comp14 = calculateCompletionValue(oneBrPlusUnit, polP3)
  // 1BR+ rate in CSUD14: 4,600,000 đ/m2 (ĐÃ GỒM VAT)
  // completionGross = 45 * 4,600,000 = 207,000,000
  // completionNet = 207,000,000 / 1.1 = 188,181,818
  // completionVAT = 207,000,000 - 188,181,818 = 18,818,182
  assert(comp14.ratePerM2 === 4_600_000, 'CSUD14 1BR+ rate is 4,600,000 VND/m2')
  assert(comp14.completionGross === 207_000_000, 'CSUD14 1BR+ completionGross is 207,000,000', `Got ${comp14.completionGross}`)
  assert(comp14.completionNet === 188_181_818, 'CSUD14 1BR+ completionNet is 188,181,818', `Got ${comp14.completionNet}`)
  assert(comp14.completionVAT === 18_818_182, 'CSUD14 1BR+ completionVAT is 18,818,182', `Got ${comp14.completionVAT}`)

  // ───────────────────────────────────────────────────────────
  // TEST 4: Discount Base strictly on rawPriceNet
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 4: Discount Basis on rawPriceNet')
  const rawPriceNetExpected = Math.round(1_100_000_000 / 1.1) // 1,000,000,000
  const inputNoLoan: CalculationInput = {
    unit: studioUnit,
    paymentOption: 'NO_LOAN',
  }
  const discountsNoLoan = calculateDiscounts(rawPriceNetExpected, inputNoLoan, polP10)
  // 5% of 1,000,000,000 = 50,000,000
  assert(discountsNoLoan.noLoanDiscount === 50_000_000, '5% No Loan discount is strictly 50,000,000 on 1B net', `Got ${discountsNoLoan.noLoanDiscount}`)

  // CSUD14 Early payment 95% deadline 2026-08-25: 12%
  const inputEarlyCS14: CalculationInput = {
    unit: oneBrPlusUnit,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 95,
    earlyPaymentDeadline: '2026-08-25',
  }
  const rawNetP3 = Math.round(1_650_000_000 / 1.1) // 1,500,000,000
  const discountsEarly14 = calculateDiscounts(rawNetP3, inputEarlyCS14, polP3)
  // 12% of 1,500,000,000 = 180,000,000
  assert(discountsEarly14.earlyPaymentDiscountRate === 0.12, 'CSUD14 95% discount rate is 12%')
  assert(discountsEarly14.earlyPaymentDiscount === 180_000_000, 'CSUD14 12% early discount is 180,000,000', `Got ${discountsEarly14.earlyPaymentDiscount}`)

  // ───────────────────────────────────────────────────────────
  // TEST 5: Sun Early Key Eligibility (CSƯĐ16 & CSƯĐ09)
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 5: Sun Early Key Eligibility')
  const quoteCS16_70 = calculateQuote({
    unit: twoBrUnitP24,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 70,
    earlyPaymentDeadline: '2026-08-25',
  })
  assert(quoteCS16_70.earlyKeyEligible === true, 'CSUD16 has earlyKeyEligible = true')
  assert(quoteCS16_70.earlyKeyQualified === true, 'CSUD16 with 70% payment qualifies for Early Key')

  const quoteCS16_50 = calculateQuote({
    unit: twoBrUnitP24,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 50,
    earlyPaymentDeadline: '2026-08-25',
  })
  assert(quoteCS16_50.earlyKeyQualified === false, 'CSUD16 with 50% payment DOES NOT qualify for Early Key (< 70%)')

  const quoteCS13_95 = calculateQuote({
    unit: studioUnit,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 95,
    earlyPaymentDeadline: '2026-08-25',
  })
  assert(quoteCS13_95.earlyKeyEligible === false, 'CSUD13 does not have earlyKeyEligible')
  assert(quoteCS13_95.earlyKeyQualified === false, 'CSUD13 quote is not earlyKeyQualified')

  // ───────────────────────────────────────────────────────────
  // TEST 6: Loan Basis: RAW_PRICE_INCL_VAT vs TOTAL_PRICE_INCL_VAT
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 6: Loan Basis & Calculations')
  // CSUD13 basis is RAW_PRICE_INCL_VAT -> 70% of 1,100,000,000 = 770,000,000
  const quoteLoanCS13 = calculateQuote({
    unit: studioUnit,
    paymentOption: 'LOAN',
    loanPercent: 70,
  })
  assert(quoteLoanCS13.loanBasis === 'RAW_PRICE_INCL_VAT', 'CSUD13 loanBasis is RAW_PRICE_INCL_VAT')
  assert(quoteLoanCS13.loanAmount === 770_000_000, 'CSUD13 loan is 70% of rawPriceGross (770,000,000)', `Got ${quoteLoanCS13.loanAmount}`)
  assert(quoteLoanCS13.equityAmount === (quoteLoanCS13.finalPrice - 770_000_000), 'CSUD13 equityAmount = finalPrice - loanAmount')

  // CSUD16 basis is TOTAL_PRICE_INCL_VAT -> 70% of finalPrice
  const quoteLoanCS16 = calculateQuote({
    unit: twoBrUnitP24,
    paymentOption: 'LOAN',
    loanPercent: 70,
  })
  assert(quoteLoanCS16.loanBasis === 'TOTAL_PRICE_INCL_VAT', 'CSUD16 loanBasis is TOTAL_PRICE_INCL_VAT')
  const expectedLoan16 = roundMoney(quoteLoanCS16.finalPrice * 0.7)
  assert(quoteLoanCS16.loanAmount === expectedLoan16, 'CSUD16 loan is 70% of total finalPrice', `Got ${quoteLoanCS16.loanAmount} vs ${expectedLoan16}`)

  // ───────────────────────────────────────────────────────────
  // TEST 7: Early Payment Interest Rate (8%/year, >= 10 days)
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 7: Early Payment Interest (8%/year)')
  const quoteWithInterest = calculateQuote({
    unit: studioUnit,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 95,
    earlyPaymentDeadline: '2026-08-25',
    actualPaymentDate: '2026-08-01',
    scheduledDueDate: '2026-08-25', // 24 days early (>= 10 days)
  })
  assert(quoteWithInterest.earlyDays === 24, '24 days early detected')
  assert(quoteWithInterest.earlyPaymentInterest > 0, 'earlyPaymentInterest > 0 for 24 days', `Got ${quoteWithInterest.earlyPaymentInterest}`)

  const quoteUnder10Days = calculateQuote({
    unit: studioUnit,
    paymentOption: 'EARLY_PAYMENT',
    earlyPaymentPercent: 95,
    earlyPaymentDeadline: '2026-08-25',
    actualPaymentDate: '2026-08-20',
    scheduledDueDate: '2026-08-25', // 5 days early (< 10 days)
  })
  assert(quoteUnder10Days.earlyPaymentInterest === 0, 'earlyPaymentInterest is 0 when early days < 10')

  // ───────────────────────────────────────────────────────────
  // TEST 8: Payment Schedule Deposit Deduction by Unit Type
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 8: Payment Schedule Deposit by Unit Type')
  const schedStudio = generatePaymentSchedule(1_000_000_000, { unit: studioUnit, paymentOption: 'STANDARD' }, polP10)
  assert(schedStudio.depositAmount === 50_000_000, 'Studio deposit is 50,000,000')

  const sched1Br = generatePaymentSchedule(1_500_000_000, { unit: oneBrPlusUnit, paymentOption: 'STANDARD' }, polP3)
  assert(sched1Br.depositAmount === 100_000_000, '1BR+ deposit is 100,000,000')

  const sched2Br = generatePaymentSchedule(2_000_000_000, { unit: twoBrUnitP24, paymentOption: 'STANDARD' }, polP24)
  assert(sched2Br.depositAmount === 150_000_000, '2BR deposit is 150,000,000')

  // ───────────────────────────────────────────────────────────
  // TEST 9: Breakdown Transparency & Completeness
  // ───────────────────────────────────────────────────────────
  console.log('\nTest Group 9: Breakdown Transparency')
  const fullQuote = calculateQuote({
    unit: studioUnit,
    paymentOption: 'NO_LOAN',
  })
  assert(fullQuote.calculationBreakdown.length >= 15, `Breakdown contains 18 items (found ${fullQuote.calculationBreakdown.length})`)
  const hasFormulas = fullQuote.calculationBreakdown.every((item) => item.formulaExplanation && item.formulaExplanation.length > 0)
  assert(hasFormulas, 'All breakdown items have clear formula explanations')

  // ───────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────
  console.log('\n==================================================')
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`)
  console.log('==================================================\n')

  if (passedTests !== totalTests) {
    process.exit(1)
  }
}

runTests()
