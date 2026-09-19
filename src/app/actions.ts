'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getUnits() {
  return prisma.unit.findMany({
    orderBy: [{ building: 'asc' }, { floor: 'asc' }, { unitCode: 'asc' }]
  })
}

export async function getPolicies() {
  return prisma.policy.findMany({
    where: { isActive: true }
  })
}

export async function getPaymentPlans() {
  return prisma.paymentPlan.findMany({
    include: {
      schedules: true
    }
  })
}

// Giả lập lưu báo giá
export async function saveQuote(data: any) {
  // Bỏ qua tạo thật để demo nhanh, thực tế sẽ gọi prisma.quote.create
  return { id: `QUOTE-${Date.now()}` }
}

export async function importUnitsCSV(csvData: string) {
  // Phân tích CSV đơn giản, format: unitCode,building,floor,unitType,area,direction,view,basePrice,status
  const rows = csvData.split('\n').filter(r => r.trim());
  if (rows.length <= 1) return { error: 'Empty file' };
  
  const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
  
  let successCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(',').map(c => c.trim());
    if (cols.length < 8) continue;
    
    await prisma.unit.upsert({
      where: { unitCode: cols[0] },
      update: {
        basePrice: Number(cols[7]),
        status: cols[8] || 'AVAILABLE'
      },
      create: {
        unitCode: cols[0],
        building: cols[1],
        floor: Number(cols[2]),
        unitType: cols[3],
        area: Number(cols[4]),
        direction: cols[5],
        view: cols[6],
        basePrice: Number(cols[7]),
        status: cols[8] || 'AVAILABLE'
      }
    });
    successCount++;
  }
  
  return { successCount };
}
