'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function saveUnit(data: any) {
  try {
    if (data.id) {
      await prisma.unit.update({
        where: { id: data.id },
        data: {
          unitCode: data.unitCode,
          building: data.building,
          floor: Number(data.floor),
          unitType: data.unitType,
          area: Number(data.area),
          direction: data.direction,
          view: data.view,
          basePrice: Number(data.basePrice),
          imageUrl: data.imageUrl || null
        }
      })
    } else {
      await prisma.unit.create({
        data: {
          unitCode: data.unitCode,
          building: data.building,
          floor: Number(data.floor),
          unitType: data.unitType,
          area: Number(data.area),
          direction: data.direction,
          view: data.view,
          basePrice: Number(data.basePrice),
          imageUrl: data.imageUrl || null
        }
      })
    }
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUnit(id: string) {
  try {
    await prisma.unit.delete({ where: { id } })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function savePolicy(data: any) {
  try {
    if (data.id) {
      await prisma.policy.update({
        where: { id: data.id },
        data: {
          name: data.name,
          discountPercent: Number(data.discountPercent) || 0,
          discountAmount: Number(data.discountAmount) || 0,
          giftValue: Number(data.giftValue) || 0,
        }
      })
    } else {
      await prisma.policy.create({
        data: {
          name: data.name,
          discountPercent: Number(data.discountPercent) || 0,
          discountAmount: Number(data.discountAmount) || 0,
          giftValue: Number(data.giftValue) || 0,
        }
      })
    }
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deletePolicy(id: string) {
  try {
    await prisma.policy.delete({ where: { id } })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function savePaymentPlan(data: any) {
  try {
    if (data.id) {
      await prisma.paymentPlan.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type
        }
      })
    } else {
      await prisma.paymentPlan.create({
        data: {
          name: data.name,
          type: data.type
        }
      })
    }
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deletePaymentPlan(id: string) {
  try {
    await prisma.paymentPlan.delete({ where: { id } })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
