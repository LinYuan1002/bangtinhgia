import test from 'node:test'
import assert from 'node:assert'
import {
  calculatePrice,
  calculateStackedDiscount,
  calculateSequentialDiscount,
  calculatePaymentSchedule,
  validatePaymentSchedule,
  getUnitDeposit,
  calculateLoan,
  calculateInitialCashRequired,
  formatVND,
  parseCurrency,
} from './calculations'

test('PRICE: STACKED discount calculation works accurately without intermediate rounding', () => {
  // Base price: 2,500,000,000
  // 5% percentage discount = 125,000,000
  // 50,000,000 fixed discount
  // 3% early payment = 75,000,000
  const result = calculatePrice({
    basePrice: 2500000000,
    area: 50,
    percentageDiscount: 5,
    fixedDiscount: 50000000,
    earlyPaymentDiscount: 3, // 3%
    discountCalculationMode: 'STACKED',
  })

  assert.strictEqual(result.basePrice, 2500000000)
  assert.strictEqual(result.percentageDiscountAmount, 125000000)
  assert.strictEqual(result.fixedDiscountAmount, 50000000)
  assert.strictEqual(result.earlyPaymentDiscountAmount, 75000000)
  assert.strictEqual(result.totalDiscount, 250000000)
  assert.strictEqual(result.finalPrice, 2250000000)
  assert.strictEqual(result.originalPricePerM2, 50000000)
  assert.strictEqual(result.finalPricePerM2, 45000000)
})

test('PRICE: SEQUENTIAL discount calculates sequentially on remaining balance', () => {
  // Base price: 2,000,000,000
  // Step 1: 10% = 200,000,000 -> Remaining: 1,800,000,000
  // Step 2: 5% on 1,800,000,000 = 90,000,000 -> Remaining: 1,710,000,000
  const seq = calculateSequentialDiscount(2000000000, [
    { key: 'd1', name: 'CK 10%', percent: 10 },
    { key: 'd2', name: 'CK 5% sớm', percent: 5 },
  ])

  assert.strictEqual(seq.steps[0].amount, 200000000)
  assert.strictEqual(seq.steps[0].priceAfterDiscount, 1800000000)
  assert.strictEqual(seq.steps[1].amount, 90000000)
  assert.strictEqual(seq.steps[1].priceAfterDiscount, 1710000000)
  assert.strictEqual(seq.totalDiscount, 290000000)
  assert.strictEqual(seq.finalPrice, 1710000000)
})

test('PAYMENT: Schedule validation enforces 100% total', () => {
  const invalid = validatePaymentSchedule([
    { name: 'Cọc', percentage: 10 },
    { name: 'Đợt 1', percentage: 80 },
  ])
  assert.strictEqual(invalid.isValid, false)
  assert.strictEqual(invalid.totalPercentage, 90)

  const valid = validatePaymentSchedule([
    { name: 'Cọc', percentage: 10 },
    { name: 'Đợt 1', percentage: 85 },
    { name: 'Đợt 2', percentage: 5 },
  ])
  assert.strictEqual(valid.isValid, true)
  assert.strictEqual(valid.totalPercentage, 100)
})

test('PAYMENT: Schedule calculation computes installment amounts and cumulative balances', () => {
  const result = calculatePaymentSchedule(2000000000, [
    { name: 'Cọc', percentage: 10 },
    { name: 'Đợt 1', percentage: 40 },
    { name: 'Đợt 2', percentage: 50 },
  ])

  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.installments.length, 3)
  assert.strictEqual(result.installments[0].amount, 200000000)
  assert.strictEqual(result.installments[0].cumulativeAmount, 200000000)
  assert.strictEqual(result.installments[1].amount, 800000000)
  assert.strictEqual(result.installments[1].cumulativeAmount, 1000000000)
  assert.strictEqual(result.installments[2].amount, 1000000000)
  assert.strictEqual(result.installments[2].cumulativeAmount, 2000000000)
  assert.strictEqual(result.installments[2].remainingAmount, 0)
})

test('LOAN: Equal Payment (PMT) calculates monthly payment and interest amortization', () => {
  const loan = calculateLoan({
    principal: 1000000000,
    annualInterestRate: 12,
    loanTermMonths: 12,
    repaymentMethod: 'EQUAL_PAYMENT',
  })

  assert.ok(loan.monthlyPayment > 88848000 && loan.monthlyPayment < 88849000)
  assert.strictEqual(loan.schedule.length, 12)
  assert.strictEqual(loan.totalPrincipal, 1000000000)
  assert.ok(loan.schedule[11].remainingPrincipal < 1) // fully paid off
})

test('LOAN: Equal Principal (Dư nợ giảm dần) reduces interest as principal decreases', () => {
  const loan = calculateLoan({
    principal: 1200000000,
    annualInterestRate: 12, // 1% per month
    loanTermMonths: 12,
    repaymentMethod: 'EQUAL_PRINCIPAL',
  })

  assert.strictEqual(loan.schedule.length, 12)
  // Month 1: 100m principal + 12m interest (1% of 1.2B) = 112m
  assert.strictEqual(loan.schedule[0].principal, 1000000000 / 10)
  assert.strictEqual(loan.schedule[0].interest, 12000000)
  assert.strictEqual(loan.schedule[0].payment, 112000000)
  // Month 2: remaining 1.1B -> interest 11m -> payment 111m
  assert.strictEqual(loan.schedule[1].interest, 11000000)
  assert.strictEqual(loan.schedule[1].payment, 111000000)
})

test('CASHFLOW: Calculate initial cash required with breakdown', () => {
  const cf = calculateInitialCashRequired({
    finalPrice: 2000000000,
    equityAmount: 600000000, // 30%
    preDisbursePayments: [{ name: 'Cọc', amount: 100000000 }],
    fees: [{ name: 'Phí thẩm định', amount: 5000000 }],
    supports: [{ name: 'Voucher nội thất', amount: 20000000 }],
  })

  assert.strictEqual(cf.totalRequired, 705000000) // 600m + 100m + 5m
  assert.strictEqual(cf.totalSupport, 20000000)
  assert.strictEqual(cf.netCashRequired, 685000000)
})

test('CURRENCY: formatVND and parseCurrency work reliably', () => {
  assert.strictEqual(parseCurrency('2,500,000,000'), 2500000000)
  assert.strictEqual(parseCurrency('2.500.000.000 ₫'), 2500000000)
  assert.strictEqual(parseCurrency(3000000), 3000000)
})

test('DEPOSIT: getUnitDeposit returns correct deposit by unit type', () => {
  assert.strictEqual(getUnitDeposit({ unitTypeName: 'Studio', bedrooms: 1 }), 50000000)
  assert.strictEqual(getUnitDeposit({ unitTypeName: '1BR+', bedrooms: 1 }), 100000000)
  assert.strictEqual(getUnitDeposit({ unitTypeName: '2BR', bedrooms: 2 }), 150000000)
  assert.strictEqual(getUnitDeposit({ unitTypeName: '3BR', bedrooms: 3 }), 200000000)
  assert.strictEqual(getUnitDeposit({ depositAmount: 80000000 }), 80000000) // custom override
})

test('EXCEL PLAN 1: Vay NH 70% matches exact numbers from Excel Image 1', () => {
  const price = 1982730950
  const unit = { unitTypeName: '1BR+', bedrooms: 1 }
  const items = [
    { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0 },
    { name: 'Đợt 2 (Ký HĐMB - Đóng đủ 15% gồm cọc)', percentage: 15 },
    { name: 'Đợt 3 (Ngân hàng giải ngân 70%)', percentage: 70 },
    { name: 'Đợt 4 (Vốn tự có 10%)', percentage: 10 },
    { name: 'Đợt 5 (Bàn giao & Cấp GCN)', percentage: 5 },
  ]

  const res = calculatePaymentSchedule(price, items, unit)
  assert.strictEqual(res.isValid, true)
  assert.strictEqual(res.installments[0].amount, 100000000) // 100M cọc
  assert.strictEqual(res.installments[1].amount, 197409643) // 15% - 100M cọc (EXACT match to Excel!)
  assert.strictEqual(res.installments[1].cumulativeAmount, 297409643) // 15% tổng giá
  assert.strictEqual(res.installments[2].amount, 1387911665) // 70% ngân hàng (EXACT match to Excel!)
  assert.strictEqual(res.installments[3].amount, 198273095) // 10% vốn tự có (EXACT match to Excel!)
  assert.strictEqual(res.totalAmount, price)
})

test('EXCEL PLAN 2: Tiến độ chuẩn 17 đợt Studio matches exact numbers from Excel Image 2', () => {
  const price = 1894001000
  const unit = { unitTypeName: 'Studio', bedrooms: 0 }
  const items = [
    { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0 },
    { name: 'Đợt 2 (Ký HĐMB - Đóng đủ 15% gồm cọc)', percentage: 15 },
    { name: 'Đợt 3', percentage: 10 },
    { name: 'Đợt 4', percentage: 5 },
    { name: 'Đợt 5', percentage: 5 },
    { name: 'Đợt 6', percentage: 5 },
    { name: 'Đợt 7', percentage: 5 },
    { name: 'Đợt 8', percentage: 5 },
    { name: 'Đợt 9', percentage: 5 },
    { name: 'Đợt 10', percentage: 5 },
    { name: 'Đợt 11', percentage: 10 },
    { name: 'Đợt 12', percentage: 5 },
    { name: 'Đợt 13', percentage: 5 },
    { name: 'Đợt 14', percentage: 5 },
    { name: 'Đợt 15', percentage: 5 },
    { name: 'Đợt 16', percentage: 5 },
    { name: 'Đợt 17', percentage: 5 },
  ]

  const res = calculatePaymentSchedule(price, items, unit)
  assert.strictEqual(res.isValid, true)
  assert.strictEqual(res.installments[0].amount, 50000000) // Studio 50M cọc
  assert.strictEqual(res.installments[1].amount, 234100150) // 15% - 50M cọc (EXACT match to Excel!)
  assert.strictEqual(res.installments[2].amount, 189400100) // 10%
  assert.strictEqual(res.installments[3].amount, 94700050) // 5%
  assert.strictEqual(res.totalAmount, price)
})

test('EXCEL PLAN 3 & 4: TTS 70% and TTS 95% deduct deposit and sum to total price', () => {
  const price70 = 1885811057
  const unit1BR = { unitTypeName: '1BR+', bedrooms: 1 }
  const res70 = calculatePaymentSchedule(price70, [
    { name: 'Đợt 1 (Ký HĐTHNV / Đặt cọc)', percentage: 0 },
    { name: 'Đợt 2 (Thanh toán lần 2 - Đóng đủ 70% gồm cọc)', percentage: 70 },
    { name: 'Đợt 3', percentage: 5 },
    { name: 'Đợt 4', percentage: 5 },
    { name: 'Đợt 5', percentage: 5 },
    { name: 'Đợt 6', percentage: 5 },
    { name: 'Đợt 7', percentage: 5 },
    { name: 'Đợt 8 (Bàn giao)', percentage: 5 },
  ], unit1BR)

  assert.strictEqual(res70.installments[0].amount, 100000000)
  assert.strictEqual(res70.installments[1].amount, 1220067740) // 70% - 100M cọc (EXACT match to Excel Image 3!)
  assert.strictEqual(res70.totalAmount, price70)

  const price95 = 2000000000
  const res95 = calculatePaymentSchedule(price95, [
    { name: 'Đợt 1 (Cọc)', percentage: 0 },
    { name: 'Đợt 2 (95% gồm cọc)', percentage: 95 },
    { name: 'Đợt 3 (5% Bàn giao)', percentage: 5 },
  ], unit1BR)

  assert.strictEqual(res95.installments[0].amount, 100000000)
  assert.strictEqual(res95.installments[1].amount, 1800000000) // 95% = 1.9B - 100M = 1.8B
  assert.strictEqual(res95.installments[2].amount, 100000000) // 5% = 100M
  assert.strictEqual(res95.totalAmount, price95)
})
