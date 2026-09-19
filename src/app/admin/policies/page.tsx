import { prisma } from '@/lib/prisma'
import PoliciesClient from './PoliciesClient'

export default async function PoliciesPage() {
  const policies = await prisma.policy.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  })

  return <PoliciesClient initialPolicies={policies} />
}
