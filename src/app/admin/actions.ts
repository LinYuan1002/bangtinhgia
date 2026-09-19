'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── UNITS ───────────────────────────────

export async function saveUnit(data: any) {
  try {
    const basePrice = parseFloat(data.basePrice) || 0
    const area = parseFloat(data.area) || 0
    const pricePerM2 = area > 0 ? basePrice / area : 0

    let unit: any = null

    if (data.id && !String(data.id).startsWith('fb-')) {
      const existing = await prisma.unit.findUnique({ where: { id: data.id } })
      if (existing && existing.basePrice !== basePrice) {
        await prisma.priceHistory.create({
          data: {
            unitId: data.id,
            oldPrice: existing.basePrice,
            newPrice: basePrice,
            reason: data.priceChangeReason || 'Admin update',
            changedBy: data.changedBy || 'Admin',
          },
        })
      }

      unit = await prisma.unit.update({
        where: { id: data.id },
        data: {
          buildingCode: data.buildingCode || data.building || 'S1',
          floorNumber: parseInt(data.floorNumber || data.floor) || 1,
          unitCode: data.unitCode,
          unitTypeName: data.unitTypeName || data.unitType || '1PN',
          area,
          direction: data.direction || '',
          view: data.view || '',
          basePrice,
          pricePerM2,
          status: data.status || 'AVAILABLE',
          imageUrl: data.imageUrl || null,
          notes: data.notes || null,
        },
      })
    } else {
      unit = await prisma.unit.create({
        data: {
          buildingCode: data.buildingCode || data.building || 'S1',
          floorNumber: parseInt(data.floorNumber || data.floor) || 1,
          unitCode: data.unitCode,
          unitTypeName: data.unitTypeName || data.unitType || '1PN',
          area,
          direction: data.direction || '',
          view: data.view || '',
          basePrice,
          pricePerM2,
          status: data.status || 'AVAILABLE',
          imageUrl: data.imageUrl || null,
          notes: data.notes || null,
        },
      })
    }
    revalidatePath('/admin')
    revalidatePath('/admin/units')
    revalidatePath('/')
    revalidatePath('/inventory')
    return { success: true, unit }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteUnit(id: string) {
  try {
    const existing = await prisma.unit.findUnique({ where: { id } })
    if (existing) {
      await prisma.unit.delete({ where: { id } })
    }
    revalidatePath('/admin')
    revalidatePath('/admin/units')
    revalidatePath('/')
    revalidatePath('/inventory')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function bulkUpdateUnitStatus(ids: string[], status: string) {
  try {
    await prisma.unit.updateMany({
      where: { id: { in: ids } },
      data: { status },
    })
    revalidatePath('/admin/units')
    revalidatePath('/')
    return { success: true, count: ids.length }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function bulkUpdateUnitPrice(ids: string[], newPrice: number, reason: string) {
  try {
    const existing = await prisma.unit.findMany({ where: { id: { in: ids } } })
    
    await prisma.priceHistory.createMany({
      data: existing.map((u) => ({
        unitId: u.id,
        oldPrice: u.basePrice,
        newPrice,
        reason,
        changedBy: 'Admin (Bulk)',
      })),
    })

    await prisma.unit.updateMany({
      where: { id: { in: ids } },
      data: { basePrice: newPrice },
    })

    revalidatePath('/admin/units')
    revalidatePath('/')
    return { success: true, count: ids.length }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── POLICIES ───────────────────────────

export async function savePolicy(data: any) {
  try {
    const payload = {
      name: data.name,
      description: data.description || null,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      discountPercent: parseFloat(data.discountPercent) || 0,
      fixedDiscount: parseFloat(data.fixedDiscount) || 0,
      earlyPaymentDiscount: parseFloat(data.earlyPaymentDiscount) || 0,
      earlyPaymentDiscountPct: parseFloat(data.earlyPaymentDiscountPct) || 0,
      specialDiscount: parseFloat(data.specialDiscount) || 0,
      giftValue: parseFloat(data.giftValue) || 0,
      discountMode: data.discountMode || 'STACKED',
      status: data.status || 'DRAFT',
      priority: parseInt(data.priority) || 0,
    }

    let policy: any = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      policy = await prisma.policy.update({ where: { id: data.id }, data: payload })
    } else {
      policy = await prisma.policy.create({ data: payload })
    }
    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true, policy }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updatePolicyStatus(id: string, status: string) {
  try {
    await prisma.policy.update({ where: { id }, data: { status } })
    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deletePolicy(id: string) {
  try {
    const existing = await prisma.policy.findUnique({ where: { id } })
    if (existing) {
      await prisma.policy.delete({ where: { id } })
    }
    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── PAYMENT PLANS ───────────────────────

export async function savePaymentPlan(data: any) {
  try {
    let plan: any = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      plan = await prisma.paymentPlan.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type || 'STANDARD',
          description: data.description || null,
          isActive: data.isActive ?? true,
        },
      })
    } else {
      plan = await prisma.paymentPlan.create({
        data: {
          name: data.name,
          type: data.type || 'STANDARD',
          description: data.description || null,
          isActive: data.isActive ?? true,
        },
      })
    }
    revalidatePath('/admin/payment-plans')
    revalidatePath('/')
    return { success: true, plan }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function savePaymentScheduleItems(planId: string, items: any[]) {
  try {
    await prisma.paymentScheduleItem.deleteMany({ where: { paymentPlanId: planId } })
    await prisma.paymentScheduleItem.createMany({
      data: items.map((item, i) => ({
        paymentPlanId: planId,
        stepNumber: i + 1,
        name: item.name,
        percentage: parseFloat(item.percentage) || 0,
        fixedAmount: item.fixedAmount ? parseFloat(item.fixedAmount) : null,
        dueDateNote: item.dueDateNote || null,
        relativeDays: item.relativeDays ? parseInt(item.relativeDays) : null,
      })),
    })
    revalidatePath('/admin/payment-plans')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deletePaymentPlan(id: string) {
  try {
    const existing = await prisma.paymentPlan.findUnique({ where: { id } })
    if (existing) {
      await prisma.paymentPlan.delete({ where: { id } })
    }
    revalidatePath('/admin/payment-plans')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── LOAN PROGRAMS ───────────────────────

export async function saveLoanProgram(data: any) {
  try {
    const payload = {
      name: data.name,
      bankName: data.bankName || '',
      annualInterestRate: parseFloat(data.annualInterestRate) || 0,
      interestRateType: data.interestRateType || 'FIXED',
      maxLoanPercent: parseFloat(data.maxLoanPercent) || 70,
      maxLoanTermMonths: parseInt(data.maxLoanTermMonths) || 240,
      repaymentMethod: data.repaymentMethod || 'EQUAL_PAYMENT',
      interestSupport: data.interestSupport ?? false,
      supportRate: parseFloat(data.supportRate) || 0,
      supportPeriodMonths: parseInt(data.supportPeriodMonths) || 0,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      status: data.status || 'ACTIVE',
      notes: data.notes || null,
    }

    let program: any = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      program = await prisma.loanProgram.update({ where: { id: data.id }, data: payload })
    } else {
      program = await prisma.loanProgram.create({ data: payload })
    }
    revalidatePath('/admin/loan-programs')
    revalidatePath('/')
    return { success: true, program }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteLoanProgram(id: string) {
  try {
    const existing = await prisma.loanProgram.findUnique({ where: { id } })
    if (existing) {
      await prisma.loanProgram.delete({ where: { id } })
    }
    revalidatePath('/admin/loan-programs')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── SETTINGS ────────────────────────────

export async function getSetting(key: string) {
  try {
    const s = await prisma.setting.findUnique({ where: { key } })
    return s?.value ?? null
  } catch {
    return null
  }
}

export async function upsertSetting(key: string, value: string, label?: string) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, label },
    })
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── BUILDINGS ───────────────────────────

export async function saveBuilding(data: any) {
  try {
    let projectId = data.projectId
    if (!projectId) {
      const defaultProject = await prisma.project.findFirst()
      projectId = defaultProject?.id
    }
    if (!projectId) {
      const proj = await prisma.project.create({
        data: { name: 'Sun Urban City Hà Nam', code: 'SUC' },
      })
      projectId = proj.id
    }

    let building: any = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      building = await prisma.building.update({
        where: { id: data.id },
        data: {
          name: data.name,
          code: data.code,
          totalFloors: parseInt(data.totalFloors) || 0,
          description: data.description || null,
        },
      })
    } else {
      building = await prisma.building.create({
        data: {
          projectId,
          name: data.name,
          code: data.code,
          totalFloors: parseInt(data.totalFloors) || 0,
          description: data.description || null,
        },
      })
    }
    revalidatePath('/admin/buildings')
    return { success: true, building }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteBuilding(id: string) {
  try {
    const existing = await prisma.building.findUnique({ where: { id } })
    if (existing) {
      await prisma.building.delete({ where: { id } })
    }
    revalidatePath('/admin/buildings')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
