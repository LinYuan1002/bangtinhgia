'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── UNITS ───────────────────────────────

export async function getUnits(filters?: {
  building?: string
  status?: string
  unitType?: string
  search?: string
}) {
  const where: any = {}
  if (filters?.building) where.buildingCode = filters.building
  if (filters?.status) where.status = filters.status
  if (filters?.unitType) where.unitTypeName = filters.unitType
  if (filters?.search) {
    where.unitCode = { contains: filters.search }
  }
  return prisma.unit.findMany({
    where,
    orderBy: [{ buildingCode: 'asc' }, { floorNumber: 'asc' }, { unitCode: 'asc' }],
  })
}

export async function getPolicies() {
  return prisma.policy.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPaymentPlans() {
  return prisma.paymentPlan.findMany({
    where: { isActive: true },
    include: { scheduleItems: { orderBy: { stepNumber: 'asc' } } },
  })
}

export async function getLoanPrograms() {
  return prisma.loanProgram.findMany({
    where: { status: 'ACTIVE' },
  })
}

export async function saveQuote(data: {
  unitId: string
  policyId?: string
  paymentPlanId?: string
  unitSnapshot: object
  policySnapshot?: object
  calculationSnapshot: object
  paymentSnapshot?: object
  loanSnapshot?: object
  snapshotPrice: number
  totalDiscount: number
  finalPrice: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  salesName?: string
  salesPhone?: string
}) {
  const quote = await prisma.quote.create({
    data: {
      unitId: data.unitId,
      policyId: data.policyId,
      paymentPlanId: data.paymentPlanId,
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
