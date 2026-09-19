import { prisma } from '@/lib/prisma'
import BuildingsClient from './BuildingsClient'

export default async function BuildingsPage() {
  const buildings = await prisma.building.findMany({
    include: {
      _count: {
        select: { units: true },
      },
    },
    orderBy: { code: 'asc' },
  })

  return <BuildingsClient initialBuildings={buildings} />
}
