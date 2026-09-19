import { prisma } from '@/lib/prisma'
import UnitsClient from './UnitsClient'

export default async function UnitsPage() {
  let units: any[] = []
  try {
    units = await prisma.unit.findMany({
      orderBy: [{ buildingCode: 'asc' }, { floorNumber: 'asc' }, { unitCode: 'asc' }],
    })
  } catch {}

  return <UnitsClient initialUnits={units} />
}
