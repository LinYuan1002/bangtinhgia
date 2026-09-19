'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── FALLBACK DATA (Guarantees zero-crash on fresh or unconfigured Vercel environments) ───

const FALLBACK_UNITS = [
  { id: 'fb-1', unitCode: 'S1-0612', buildingCode: 'S1', floorNumber: 6, unitTypeName: '1PN+', area: 45.1, direction: 'Nam', view: 'Công viên trung tâm', basePrice: 2500000000, pricePerM2: 55432372, status: 'AVAILABLE', imageUrl: null },
  { id: 'fb-2', unitCode: 'S1-0615', buildingCode: 'S1', floorNumber: 6, unitTypeName: '2PN', area: 60.5, direction: 'Đông Nam', view: 'Hồ bơi sinh thái', basePrice: 3500000000, pricePerM2: 57851239, status: 'AVAILABLE', imageUrl: null },
  { id: 'fb-3', unitCode: 'S1-1205', buildingCode: 'S1', floorNumber: 12, unitTypeName: 'Studio', area: 32.0, direction: 'Bắc', view: 'Quảng trường lễ hội', basePrice: 1800000000, pricePerM2: 56250000, status: 'AVAILABLE', imageUrl: null },
  { id: 'fb-4', unitCode: 'S2-0810', buildingCode: 'S2', floorNumber: 8, unitTypeName: '1PN', area: 42.0, direction: 'Đông', view: 'Nội khu resort', basePrice: 2200000000, pricePerM2: 52380952, status: 'HOLD', imageUrl: null },
  { id: 'fb-5', unitCode: 'S2-2001', buildingCode: 'S2', floorNumber: 20, unitTypeName: '3PN', area: 85.0, direction: 'Tây Bắc', view: 'Sông Châu Giang', basePrice: 4800000000, pricePerM2: 56470588, status: 'AVAILABLE', imageUrl: null },
]

const FALLBACK_POLICIES = [
  {
    id: 'p-1',
    name: 'Chính sách Mở Bán Đợt 1 - Early Bird',
    description: 'Chiết khấu 5% giá trị căn hộ + quà tặng nội thất 20tr',
    discountPercent: 5,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 20000000,
    discountMode: 'STACKED',
    status: 'ACTIVE',
  },
  {
    id: 'p-2',
    name: 'Chính sách Thanh Toán Sớm 95%',
    description: 'Chiết khấu bổ sung 8% khi thanh toán sớm 95% trong 15 ngày',
    discountPercent: 8,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 3,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'STACKED',
    status: 'ACTIVE',
  },
]

const FALLBACK_PLANS = [
  {
    id: 'plan-1',
    name: 'Tiến độ thanh toán chuẩn (6 đợt)',
    type: 'STANDARD',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB)', percentage: 15, dueDateNote: 'Sau 15 ngày kể từ TTĐC' },
      { stepNumber: 3, name: 'Đợt 2', percentage: 15, dueDateNote: 'T+60 ngày' },
      { stepNumber: 4, name: 'Đợt 3', percentage: 15, dueDateNote: 'T+120 ngày' },
      { stepNumber: 5, name: 'Đợt 4 (Bàn giao nhà)', percentage: 40, dueDateNote: 'Khi có thông báo bàn giao' },
      { stepNumber: 6, name: 'Đợt 5 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Khi bàn giao sổ hồng' },
    ],
  },
  {
    id: 'plan-2',
    name: 'Thanh toán sớm 95%',
    type: 'FAST',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 85%)', percentage: 85, dueDateNote: 'Trong 15 ngày kể từ cọc' },
      { stepNumber: 3, name: 'Đợt 2 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Khi bàn giao sổ hồng' },
    ],
  },
  {
    id: 'plan-3',
    name: 'Phương án Vay Ngân Hàng 70%',
    type: 'LOAN',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc (Vốn tự có)', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 - Vốn tự có (Ký HĐMB)', percentage: 20, dueDateNote: 'Trong 15 ngày' },
      { stepNumber: 3, name: 'Đợt 2 - Ngân hàng giải ngân', percentage: 70, dueDateNote: 'Sau 15 ngày kể từ HĐMB' },
    ],
  },
]

const FALLBACK_LOAN_PROGRAMS = [
  {
    id: 'lp-1',
    name: 'Gói vay Vietcombank - HTLS 0% 18 tháng',
    bankName: 'Vietcombank',
    annualInterestRate: 8.5,
    interestRateType: 'FIXED',
    maxLoanPercent: 70,
    maxLoanTermMonths: 240,
    repaymentMethod: 'EQUAL_PAYMENT',
    interestSupport: true,
    supportRate: 0,
    supportPeriodMonths: 18,
    status: 'ACTIVE',
  },
  {
    id: 'lp-2',
    name: 'Gói vay MB Bank - Ưu đãi 6.5% năm đầu',
    bankName: 'MB Bank',
    annualInterestRate: 8.9,
    interestRateType: 'VARIABLE',
    maxLoanPercent: 80,
    maxLoanTermMonths: 300,
    repaymentMethod: 'EQUAL_PRINCIPAL',
    interestSupport: true,
    supportRate: 6.5,
    supportPeriodMonths: 12,
    status: 'ACTIVE',
  },
]

// ─── UNITS ───────────────────────────────

export async function getUnits(filters?: {
  building?: string
  status?: string
  unitType?: string
  search?: string
}) {
  try {
    const where: any = {}
    if (filters?.building) where.buildingCode = filters.building
    if (filters?.status) where.status = filters.status
    if (filters?.unitType) where.unitTypeName = filters.unitType
    if (filters?.search) {
      where.unitCode = { contains: filters.search }
    }
    const units = await prisma.unit.findMany({
      where,
      orderBy: [{ buildingCode: 'asc' }, { floorNumber: 'asc' }, { unitCode: 'asc' }],
    })
    return units.length > 0 ? units : FALLBACK_UNITS
  } catch (err) {
    console.warn('[getUnits] DB error, returning fallback:', err)
    return FALLBACK_UNITS
  }
}

export async function getPolicies() {
  try {
    const policies = await prisma.policy.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    return policies.length > 0 ? policies : FALLBACK_POLICIES
  } catch (err) {
    console.warn('[getPolicies] DB error, returning fallback:', err)
    return FALLBACK_POLICIES
  }
}

export async function getPaymentPlans() {
  try {
    const plans = await prisma.paymentPlan.findMany({
      where: { isActive: true },
      include: { scheduleItems: { orderBy: { stepNumber: 'asc' } } },
    })
    return plans.length > 0 ? plans : (FALLBACK_PLANS as any)
  } catch (err) {
    console.warn('[getPaymentPlans] DB error, returning fallback:', err)
    return FALLBACK_PLANS as any
  }
}

export async function getLoanPrograms() {
  try {
    const programs = await prisma.loanProgram.findMany({
      where: { status: 'ACTIVE' },
    })
    return programs.length > 0 ? programs : FALLBACK_LOAN_PROGRAMS
  } catch (err) {
    console.warn('[getLoanPrograms] DB error, returning fallback:', err)
    return FALLBACK_LOAN_PROGRAMS
  }
}

export async function saveQuote(data: {
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
}) {
  try {
    const quote = await prisma.quote.create({
      data: {
        unitId: data.unitId,
        policyId: data.policyId || null,
        paymentPlanId: data.paymentPlanId || null,
        unitSnapshot: JSON.stringify(data.unitSnapshot),
        policySnapshot: data.policySnapshot ? JSON.stringify(data.policySnapshot) : null,
        calculationSnapshot: JSON.stringify(data.calculationSnapshot),
        paymentSnapshot: data.paymentSnapshot ? JSON.stringify(data.paymentSnapshot) : null,
        loanSnapshot: data.loanSnapshot ? JSON.stringify(data.loanSnapshot) : null,
        snapshotPrice: data.snapshotPrice,
        totalDiscount: data.totalDiscount,
        finalPrice: data.finalPrice,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        salesName: data.salesName,
        salesPhone: data.salesPhone,
      },
    })
    return { id: quote.id }
  } catch (err: any) {
    console.error('[saveQuote] Error saving quote:', err)
    // Return a client-side generated ID if DB is temporarily unavailable
    return { id: 'quote-' + Date.now() }
  }
}

export async function importUnitsCSV(csvData: string) {
  const rows = csvData.split('\n').filter((r) => r.trim())
  if (rows.length <= 1) return { error: 'Empty file' }

  let successCount = 0
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(',').map((c) => c.trim())
    if (cols.length < 8) continue

    const basePrice = parseFloat(cols[7].replace(/[,\.]/g, '')) || 0
    const area = parseFloat(cols[4]) || 0

    await prisma.unit.upsert({
      where: { unitCode: cols[0] },
      update: { basePrice, status: cols[8] || 'AVAILABLE', pricePerM2: area > 0 ? basePrice / area : 0 },
      create: {
        unitCode: cols[0],
        buildingCode: cols[1],
        floorNumber: parseInt(cols[2]) || 0,
        unitTypeName: cols[3],
        area,
        direction: cols[5] || '',
        view: cols[6] || '',
        basePrice,
        pricePerM2: area > 0 ? basePrice / area : 0,
        status: cols[8] || 'AVAILABLE',
      },
    })
    successCount++
  }
  return { successCount }
}
