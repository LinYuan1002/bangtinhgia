import { prisma } from '@/lib/prisma'
import BuildingsClient from './BuildingsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BuildingsPage() {
  let buildings: any[] = []
  try {
    buildings = await prisma.building.findMany({
      include: {
        _count: {
          select: { units: true },
        },
      },
      orderBy: { code: 'asc' },
    })
  } catch (err) {
    console.warn('[BuildingsPage] Failed to fetch:', err)
  }

  return <BuildingsClient initialBuildings={buildings} />
}
