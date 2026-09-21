'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── FALLBACK DATA (Only used if database connection fails) ───

const FALLBACK_UNITS = [
  { id: 'unit-p12-03a02', unitCode: 'P1203A02', buildingCode: 'P12', floorNumber: 3, unitTypeName: 'Studio', area: 30.5, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 1577154839, pricePerM2: Math.round(1577154839 / 30.5), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-03a03', unitCode: 'P1203A03', buildingCode: 'P12', floorNumber: 3, unitTypeName: '1BR+', area: 46.8, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 2267461407, pricePerM2: Math.round(2267461407 / 46.8), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-03a09', unitCode: 'P1203A09', buildingCode: 'P12', floorNumber: 3, unitTypeName: '2BR', area: 54.5, bedrooms: 2, bathrooms: 2, direction: 'Đông - Bắc', view: 'Góc Sun World', basePrice: 3152171397, pricePerM2: Math.round(3152171397 / 54.5), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-03a15', unitCode: 'P1203A15', buildingCode: 'P12', floorNumber: 3, unitTypeName: '1BR+', area: 46.7, bedrooms: 1, bathrooms: 1, direction: 'Đông', view: 'View nội khu', basePrice: 2136346657, pricePerM2: Math.round(2136346657 / 46.7), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0501', unitCode: 'P120501', buildingCode: 'P12', floorNumber: 5, unitTypeName: 'Studio', area: 30.5, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 1592387825, pricePerM2: Math.round(1592387825 / 30.5), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0512', unitCode: 'P120512', buildingCode: 'P12', floorNumber: 5, unitTypeName: '1BR+', area: 46.6, bedrooms: 1, bathrooms: 1, direction: 'Đông', view: 'View sun world', basePrice: 2152294426, pricePerM2: Math.round(2152294426 / 46.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0518', unitCode: 'P120518', buildingCode: 'P12', floorNumber: 5, unitTypeName: '2BR', area: 54.6, bedrooms: 2, bathrooms: 2, direction: 'Đông - Nam', view: 'Góc + Nội Khu', basePrice: 2707630656, pricePerM2: Math.round(2707630656 / 54.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0524', unitCode: 'P120524', buildingCode: 'P12', floorNumber: 5, unitTypeName: '1BR+', area: 46.6, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 2279541308, pricePerM2: Math.round(2279541308 / 46.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0605', unitCode: 'P120605', buildingCode: 'P12', floorNumber: 6, unitTypeName: '1BR+', area: 46.6, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'CV thể thao', basePrice: 2301311211, pricePerM2: Math.round(2301311211 / 46.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0611', unitCode: 'P120611', buildingCode: 'P12', floorNumber: 6, unitTypeName: '1BR+', area: 46.6, bedrooms: 1, bathrooms: 1, direction: 'Đông', view: 'View sun world', basePrice: 2172816812, pricePerM2: Math.round(2172816812 / 46.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0621', unitCode: 'P120621', buildingCode: 'P12', floorNumber: 6, unitTypeName: 'Studio', area: 30.5, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 1639641174, pricePerM2: Math.round(1639641174 / 30.5), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0622', unitCode: 'P120622', buildingCode: 'P12', floorNumber: 6, unitTypeName: '1BR+', area: 46.7, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 2306249647, pricePerM2: Math.round(2306249647 / 46.7), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0907', unitCode: 'P120907', buildingCode: 'P12', floorNumber: 9, unitTypeName: 'Studio', area: 30.6, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'CV thể thao', basePrice: 1719057358, pricePerM2: Math.round(1719057358 / 30.6), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0912a', unitCode: 'P120912A', buildingCode: 'P12', floorNumber: 9, unitTypeName: '1BR+', area: 46.8, bedrooms: 1, bathrooms: 1, direction: 'Đông', view: 'View nội khu', basePrice: 2096435649, pricePerM2: Math.round(2096435649 / 46.8), status: 'AVAILABLE', imageUrl: null },
  { id: 'unit-p12-0923', unitCode: 'P120923', buildingCode: 'P12', floorNumber: 9, unitTypeName: '1BR+', area: 46.9, bedrooms: 1, bathrooms: 1, direction: 'Tây', view: 'đường 36m', basePrice: 2338036574, pricePerM2: Math.round(2338036574 / 46.9), status: 'AVAILABLE', imageUrl: null },
]

import { FALLBACK_FOLDERS } from '@/lib/fallback-data'

const FALLBACK_POLICIES = [
  {
    id: 'policy-eb-1',
    name: 'Early Bird (EB) - Chiết khấu 1%',
    description: 'Chiết khấu 1% trực tiếp vào giá bán niêm yết',
    discountPercent: 1,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-khong-vay-5',
    name: 'Không vay ngân hàng - Chiết khấu 5%',
    description: 'Chiết khấu 5% vào giá bán cho khách hàng thanh toán bằng vốn tự có',
    discountPercent: 5,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-blnh-1',
    name: 'Không nhận chứng thư BLNH - Chiết khấu 1%',
    description: 'Chiết khấu 1% tạm tính cho khách hàng không nhận bảo lãnh ngân hàng',
    discountPercent: 1,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-tts-95',
    name: 'Thanh toán sớm 95% (Đến 25/09/2026) - CK 9.5%',
    description: 'Chiết khấu 9.5% khi hoàn thành thanh toán sớm 95% muộn nhất 25/09/2026',
    discountPercent: 9.5,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 9.5,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-tts-70',
    name: 'Thanh toán sớm 70% (Đến 25/09/2026) - CK 4.5%',
    description: 'Chiết khấu 4.5% khi hoàn thành thanh toán sớm 70% muộn nhất 25/09/2026',
    discountPercent: 4.5,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 4.5,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-tts-50',
    name: 'Thanh toán sớm 50% (Đến 25/09/2026) - CK 1.5%',
    description: 'Chiết khấu 1.5% khi hoàn thành thanh toán sớm 50% muộn nhất 25/09/2026',
    discountPercent: 1.5,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 1.5,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'SEQUENTIAL',
    status: 'ACTIVE',
    folderId: 'folder-p12',
    groupName: 'CSBH T9/2026 - Quỹ Độc Quyền P12',
    applicableBuildings: 'P12',
  },
  {
    id: 'policy-s1-eb',
    name: 'Ưu đãi Khách hàng thân thiết Tòa S1, S2',
    description: 'Chiết khấu 2% tri ân khách hàng thân thiết Sun Group',
    discountPercent: 2,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 0,
    discountMode: 'STACKED',
    status: 'ACTIVE',
    folderId: 'folder-s1-s2',
    groupName: 'CSBH Mở Bán Tòa S1 - S2',
    applicableBuildings: 'S1,S2',
  },
  {
    id: 'policy-s1-gift',
    name: 'Gói quà tặng nội thất cao cấp S1, S2',
    description: 'Tặng gói voucher nội thất trị giá 30 triệu đồng',
    discountPercent: 0,
    fixedDiscount: 0,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDiscount: 0,
    specialDiscount: 0,
    giftValue: 30000000,
    discountMode: 'STACKED',
    status: 'ACTIVE',
    folderId: 'folder-s1-s2',
    groupName: 'CSBH Mở Bán Tòa S1 - S2',
    applicableBuildings: 'S1,S2',
  },
]

const FALLBACK_PLANS = [
  {
    id: 'plan-tts-95',
    name: 'Thanh toán sớm 95% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 9.5% khi hoàn thành thanh toán 95% trước 25/09/2026',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc (Studio 50tr, 1BR+ 100tr, 2BR 150tr)', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 95%)', percentage: 90, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-tts-70',
    name: 'Thanh toán sớm 70% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 4.5% khi thanh toán đủ 70% trước 25/09/2026',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 70%)', percentage: 65, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao căn hộ)', percentage: 25, dueDateNote: 'Khi nhận bàn giao nhà' },
      { stepNumber: 4, name: 'Đợt 3 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-tts-50',
    name: 'Thanh toán sớm 50% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 1.5% khi thanh toán đủ 50% trước 25/09/2026',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 50%)', percentage: 45, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao căn hộ)', percentage: 45, dueDateNote: 'Khi nhận bàn giao nhà' },
      { stepNumber: 4, name: 'Đợt 3 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-std',
    name: 'Tiến độ thanh toán chuẩn (Không vay)',
    type: 'STANDARD',
    description: 'Thanh toán giãn đều theo tiến độ thi công',
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
    id: 'plan-loan',
    name: 'Phương án Vay Ngân Hàng 70% (HTLS 0%)',
    type: 'LOAN',
    description: 'Hỗ trợ lãi suất 0% và ân hạn nợ gốc',
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc (Vốn tự có)', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 - Vốn tự có (Ký HĐMB)', percentage: 20, dueDateNote: 'Trong 15 ngày' },
      { stepNumber: 3, name: 'Đợt 2 - Ngân hàng giải ngân', percentage: 70, dueDateNote: 'Sau 15 ngày kể từ HĐMB' },
    ],
  },
]

const FALLBACK_LOAN_PROGRAMS = [
  {
    id: 'fb-lp1',
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
    id: 'fb-lp2',
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
    return await prisma.unit.findMany({
      where,
      orderBy: [{ buildingCode: 'asc' }, { floorNumber: 'asc' }, { unitCode: 'asc' }],
    })
  } catch (err) {
    console.warn('[getUnits] DB connection error, returning fallback:', err)
    return FALLBACK_UNITS
  }
}

export async function getPolicyFolders() {
  try {
    return await prisma.policyFolder.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.warn('[getPolicyFolders] DB connection error, returning fallback:', err)
    return FALLBACK_FOLDERS
  }
}

export async function getPolicies() {
  try {
    return await prisma.policy.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.warn('[getPolicies] DB connection error, returning fallback:', err)
    return FALLBACK_POLICIES
  }
}

export async function getPaymentPlans() {
  try {
    return await prisma.paymentPlan.findMany({
      where: { isActive: true },
      include: { scheduleItems: { orderBy: { stepNumber: 'asc' } } },
    })
  } catch (err) {
    console.warn('[getPaymentPlans] DB connection error, returning fallback:', err)
    return FALLBACK_PLANS as any
  }
}

export async function getLoanPrograms() {
  try {
    return await prisma.loanProgram.findMany({
      where: { status: 'ACTIVE' },
    })
  } catch (err) {
    console.warn('[getLoanPrograms] DB connection error, returning fallback:', err)
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
