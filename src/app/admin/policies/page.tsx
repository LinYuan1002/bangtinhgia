import { prisma } from '@/lib/prisma'
import PoliciesClient from './PoliciesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PoliciesPage() {
  let policies: any[] = []
  try {
    policies = await prisma.policy.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.warn('[PoliciesPage] Failed to fetch:', err)
  }

  return <PoliciesClient initialPolicies={policies} />
}
