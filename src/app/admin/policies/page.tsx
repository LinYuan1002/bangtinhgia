import { prisma } from '@/lib/prisma'
import PoliciesClient from './PoliciesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PoliciesPage() {
  let policies: any[] = []
  let availableBuildings: string[] = ['P12', 'P11', 'S1', 'S2']

  try {
    policies = await prisma.policy.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.warn('[PoliciesPage] Failed to fetch policies:', err)
  }

  try {
    const units = await prisma.unit.findMany({
      select: { buildingCode: true },
      distinct: ['buildingCode'],
    })
    const foundCodes = units.map((u) => u.buildingCode).filter(Boolean) as string[]
    if (foundCodes.length > 0) {
      availableBuildings = Array.from(new Set([...availableBuildings, ...foundCodes]))
    }
  } catch (err) {
    console.warn('[PoliciesPage] Failed to fetch buildings:', err)
  }

  return <PoliciesClient initialPolicies={policies} availableBuildings={availableBuildings} />
}
