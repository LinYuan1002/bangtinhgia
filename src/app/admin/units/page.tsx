import { prisma } from '@/lib/prisma'
import UnitsClient from './UnitsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UnitsPage() {
  let units: any[] = []
  try {
    units = await prisma.unit.findMany({
      orderBy: [{ buildingCode: 'asc' }, { floorNumber: 'asc' }, { unitCode: 'asc' }],
    })
  } catch (err) {
    console.warn('[UnitsPage] Failed to fetch units:', err)
  }

  return <UnitsClient initialUnits={units} />
}
