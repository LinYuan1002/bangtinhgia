import { prisma } from '@/lib/prisma'
import PoliciesClient from './PoliciesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PoliciesPage() {
  let policies: any[] = []
  let folders: any[] = []
  let availableBuildings: string[] = ['P12']

  try {
    folders = await prisma.policyFolder.findMany({
      where: { id: { not: 'folder-s1-s2' } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.warn('[PoliciesPage] Failed to fetch folders:', err)
  }

  try {
    policies = await prisma.policy.findMany({
      where: {
        id: { notIn: ['policy-s1-eb', 'policy-s1-gift'] },
        folderId: { not: 'folder-s1-s2' },
      },
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
      availableBuildings = Array.from(new Set(foundCodes))
    }
  } catch (err) {
    console.warn('[PoliciesPage] Failed to fetch buildings:', err)
  }

  return (
    <PoliciesClient
      initialPolicies={policies}
      initialFolders={folders}
      availableBuildings={availableBuildings}
    />
  )
}
