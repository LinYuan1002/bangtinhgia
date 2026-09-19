import test from 'node:test'
import assert from 'node:assert'
import {
  calculateDiscount,
  calculateFinalPrice,
  calculatePricePerSquareMeter,
  calculatePaymentSchedule,
  calculateLoanPayment,
  calculateTotalInterest,
  calculateCashRequired
} from './calculations'

test('calculateDiscount correctly computes discounts', () => {
  const basePrice = 2000000000;
  const policy = {
    id: '1', name: 'Test', isActive: true, createdAt: new Date(), updatedAt: new Date(), startDate: null, endDate: null,
    discountPercent: 5,       // 100tr
    discountAmount: 50000000, // 50tr
    earlyPaymentDiscount: 20000000, // 20tr
    specialDiscount: 0,
    giftValue: 10000000, // 10tr
    bankSupport: false, interestRate: 0, loanPeriod: 0
  };
  
  const discount = calculateDiscount(basePrice, policy as any);
  assert.strictEqual(discount, 180000000); // 100m + 50m + 20m + 10m
})

test('calculateFinalPrice computes final price correctly', () => {
  const basePrice = 2000000000;
  const policy = {
    id: '1', name: 'Test', isActive: true, createdAt: new Date(), updatedAt: new Date(), startDate: null, endDate: null,
    discountPercent: 10,
    discountAmount: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    bankSupport: false, interestRate: 0, loanPeriod: 0
  };
  
  const finalPrice = calculateFinalPrice(basePrice, policy as any);
  assert.strictEqual(finalPrice, 1800000000);
})

test('calculatePricePerSquareMeter works', () => {
  assert.strictEqual(calculatePricePerSquareMeter(2000000000, 50), 40000000);
  assert.strictEqual(calculatePricePerSquareMeter(2000000000, 0), 0);
})

test('calculateLoanPayment calculates correct monthly payment', () => {
  // 1 billion, 12% interest, 12 months -> 1B * (1% * 1.01^12) / (1.01^12 - 1)
  const payment = calculateLoanPayment(1000000000, 12, 12);
  assert.ok(payment > 88848000 && payment < 88849000); // ~ 88,848,788.67
})

test('calculatePaymentSchedule splits correctly', () => {
  const schedules = [
    { id: '1', paymentPlanId: 'p1', stepNumber: 1, stepName: 'Cọc', percentValue: 10, timePoint: 'T0' },
    { id: '2', paymentPlanId: 'p1', stepNumber: 2, stepName: 'Đợt 1', percentValue: 90, timePoint: 'T1' }
  ];
  
  const result = calculatePaymentSchedule(1000000000, schedules);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].amount, 100000000);
  assert.strictEqual(result[1].amount, 900000000);
})
