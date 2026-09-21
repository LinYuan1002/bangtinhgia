'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── UNITS ───────────────────────────────

export async function saveUnit(data: any) {
  try {
    const basePrice = parseFloat(data.basePrice) || 0
    const area = parseFloat(data.area) || 0
    const pricePerM2 = area > 0 ? basePrice / area : 0

    let existing = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      existing = await prisma.unit.findUnique({ where: { id: data.id } }).catch(() => null)
    }
    if (!existing && data.unitCode) {
      existing = await prisma.unit.findUnique({ where: { unitCode: data.unitCode } }).catch(() => null)
    }

    let unit: any = null

    if (existing) {
      if (existing.basePrice !== basePrice) {
        await prisma.priceHistory.create({
          data: {
            unitId: existing.id,
            oldPrice: existing.basePrice,
            newPrice: basePrice,
            reason: data.priceChangeReason || 'Admin update',
            changedBy: data.changedBy || 'Admin',
          },
        }).catch(() => {})
      }

      unit = await prisma.unit.update({
        where: { id: existing.id },
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
    console.error('[saveUnit] error:', e)
    return { error: e.message || 'Lỗi khi lưu căn hộ' }
  }
}

export async function deleteUnit(id: string) {
  try {
    const deleted = await prisma.unit.deleteMany({
      where: {
        OR: [
          { id },
          { unitCode: id },
        ],
      },
    })
    revalidatePath('/admin')
    revalidatePath('/admin/units')
    revalidatePath('/')
    revalidatePath('/inventory')
    return { success: true, count: deleted.count }
  } catch (e: any) {
    console.error('[deleteUnit] error:', e)
    return { error: e.message || 'Lỗi khi xóa căn hộ' }
  }
}

export async function clearAllSampleUnits() {
  try {
    const sampleCodes = ['S1-0612', 'S1-0615', 'S1-1205', 'S2-0810', 'S2-2001']
    const res = await prisma.unit.deleteMany({
      where: {
        OR: [
          { unitCode: { in: sampleCodes } },
          { id: { startsWith: 'fb-' } },
          { id: { startsWith: 'unit-s' } },
        ],
      },
    })
    revalidatePath('/admin')
    revalidatePath('/admin/units')
    revalidatePath('/')
    revalidatePath('/inventory')
    return { success: true, count: res.count }
  } catch (e: any) {
    console.error('[clearAllSampleUnits] error:', e)
    return { error: e.message || 'Lỗi khi xóa căn hộ mẫu' }
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
    }).catch(() => {})

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

// ─── POLICY FOLDERS (THƯ MỤC CHÍNH SÁCH BÁN HÀNG) ───

export async function savePolicyFolder(data: any) {
  try {
    const payload = {
      name: data.name,
      description: data.description || null,
      applicableBuildings: data.applicableBuildings?.trim() || 'ALL',
      status: data.status || 'ACTIVE',
      priority: parseInt(data.priority) || 0,
    }

    let existing = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      existing = await prisma.policyFolder.findUnique({ where: { id: data.id } }).catch(() => null)
    }

    let folder: any = null
    if (existing) {
      folder = await prisma.policyFolder.update({ where: { id: existing.id }, data: payload })
    } else {
      folder = await prisma.policyFolder.create({
        data: {
          id: data.id || undefined,
          ...payload,
        },
      })
    }

    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true, folder }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deletePolicyFolder(id: string) {
  try {
    await prisma.policy.deleteMany({ where: { folderId: id } }).catch(() => {})
    await prisma.policyFolder.deleteMany({ where: { id } })
    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateFolderBuildings(folderId: string, applicableBuildings: string) {
  try {
    const formatted = applicableBuildings.trim() || 'ALL'
    await prisma.policyFolder.update({
      where: { id: folderId },
      data: { applicableBuildings: formatted },
    })
    // Also sync to child policies for backward compatibility
    await prisma.policy.updateMany({
      where: { folderId },
      data: { applicableBuildings: formatted },
    }).catch(() => {})

    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── POLICIES (CHÍNH SÁCH CON) ───────────

export async function savePolicy(data: any) {
  try {
    const payload: any = {
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
      groupName: data.groupName?.trim() || 'Chính sách chung',
      applicableBuildings: data.applicableBuildings?.trim() || 'ALL',
      folderId: data.folderId || null,
    }

    let existing = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      existing = await prisma.policy.findUnique({ where: { id: data.id } }).catch(() => null)
    }

    let policy: any = null
    if (existing) {
      policy = await prisma.policy.update({ where: { id: existing.id }, data: payload })
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

export async function updatePolicyGroupBuildings(groupName: string, applicableBuildings: string) {
  try {
    const formatted = applicableBuildings.trim() || 'ALL'
    await prisma.policy.updateMany({
      where: { groupName },
      data: { applicableBuildings: formatted },
    })
    revalidatePath('/admin/policies')
    revalidatePath('/')
    return { success: true }
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
    await prisma.policy.deleteMany({ where: { id } })
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
    let existing = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      existing = await prisma.paymentPlan.findUnique({ where: { id: data.id } }).catch(() => null)
    }

    let plan: any = null
    if (existing) {
      plan = await prisma.paymentPlan.update({
        where: { id: existing.id },
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
    await prisma.paymentPlan.deleteMany({ where: { id } })
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

    let existing = null
    if (data.id && !String(data.id).startsWith('fb-')) {
      existing = await prisma.loanProgram.findUnique({ where: { id: data.id } }).catch(() => null)
    }

    let program: any = null
    if (existing) {
      program = await prisma.loanProgram.update({ where: { id: existing.id }, data: payload })
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
    await prisma.loanProgram.deleteMany({ where: { id } })
    revalidatePath('/admin/loan-programs')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── BUILDINGS ───────────────────────────

export async function saveBuilding(data: any) {
  try {
    let building: any = null
    const payload = {
      name: data.name,
      code: data.code,
      totalFloors: parseInt(data.totalFloors) || 0,
      description: data.description || null,
      projectId: data.projectId || 'proj-suc',
    }

    if (data.id) {
      building = await prisma.building.update({
        where: { id: data.id },
        data: payload,
      })
    } else {
      // Ensure default project exists
      await prisma.project.upsert({
        where: { code: 'SUC' },
        create: { id: 'proj-suc', name: 'Sun Urban City', code: 'SUC' },
        update: {},
      }).catch(() => {})

      building = await prisma.building.create({
        data: payload,
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
    await prisma.building.delete({ where: { id } })
    revalidatePath('/admin/buildings')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── SETTINGS ───────────────────────────

export async function upsertSetting(key: string, value: string, label?: string) {
  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value, label },
      update: { value, label },
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true, setting }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function saveSetting(key: string, value: string, label?: string) {
  return upsertSetting(key, value, label)
}
