import { Policy, PaymentSchedule } from '@prisma/client'

export function calculateDiscount(basePrice: number, policy?: Policy | null): number {
  if (!policy) return 0;
  
  let totalDiscount = 0;
  
  // Chiết khấu phần trăm
  if (policy.discountPercent > 0) {
    totalDiscount += basePrice * (policy.discountPercent / 100);
  }
  
  // Chiết khấu tiền mặt / cố định
  if (policy.discountAmount > 0) {
    totalDiscount += policy.discountAmount;
  }
  
  // Chiết khấu thanh toán sớm
  if (policy.earlyPaymentDiscount > 0) {
    totalDiscount += policy.earlyPaymentDiscount;
  }

  // Ưu đãi đặc biệt
  if (policy.specialDiscount > 0) {
    totalDiscount += policy.specialDiscount;
  }

  // Quà tặng
  if (policy.giftValue > 0) {
    totalDiscount += policy.giftValue;
  }

  return totalDiscount;
}

export function calculateFinalPrice(basePrice: number, policy?: Policy | null): number {
  const discount = calculateDiscount(basePrice, policy);
  return Math.max(0, basePrice - discount);
}

export function calculatePricePerSquareMeter(price: number, area: number): number {
  if (area <= 0) return 0;
  return price / area;
}

export type PaymentStepInfo = {
  stepNumber: number;
  stepName: string;
  percentValue: number;
  timePoint: string;
  amount: number;
}

export function calculatePaymentSchedule(finalPrice: number, schedules: PaymentSchedule[]): PaymentStepInfo[] {
  if (!schedules || schedules.length === 0) return [];
  
  // Sắp xếp theo stepNumber
  const sortedSchedules = [...schedules].sort((a, b) => a.stepNumber - b.stepNumber);
  
  return sortedSchedules.map(schedule => ({
    stepNumber: schedule.stepNumber,
    stepName: schedule.stepName,
    percentValue: schedule.percentValue,
    timePoint: schedule.timePoint,
    amount: finalPrice * (schedule.percentValue / 100),
  }));
}

export function calculateLoanPayment(loanAmount: number, interestRate: number, loanTermMonths: number): number {
  if (loanAmount <= 0 || loanTermMonths <= 0) return 0;
  if (interestRate === 0) return loanAmount / loanTermMonths;

  // Lãi suất tháng
  const monthlyRate = (interestRate / 100) / 12;
  
  // Công thức trả góp đều: M = P * [ i(1 + i)^n ] / [ (1 + i)^n - 1 ]
  const payment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / 
    (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    
  return payment;
}

export function calculateTotalInterest(loanAmount: number, interestRate: number, loanTermMonths: number): number {
  const monthlyPayment = calculateLoanPayment(loanAmount, interestRate, loanTermMonths);
  const totalPaid = monthlyPayment * loanTermMonths;
  return Math.max(0, totalPaid - loanAmount);
}

export function calculateCashRequired(finalPrice: number, loanAmount: number): number {
  return Math.max(0, finalPrice - loanAmount);
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatArea(area: number): string {
  return `${area.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

export function formatPricePerM2(price: number): string {
  const inMillions = price / 1000000;
  return `${inMillions.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} triệu/m²`;
}
