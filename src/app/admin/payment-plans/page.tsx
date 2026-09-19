import { prisma } from '@/lib/prisma'
import PaymentPlansClient from './PaymentPlansClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PaymentPlansPage() {
  let plans: any[] = []
  try {
    plans = await prisma.paymentPlan.findMany({
      include: {
        scheduleItems: {
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.warn('[PaymentPlansPage] Failed to fetch:', err)
  }

  return <PaymentPlansClient initialPlans={plans} />
}
