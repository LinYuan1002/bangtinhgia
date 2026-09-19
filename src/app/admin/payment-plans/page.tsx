import { prisma } from '@/lib/prisma'
import PaymentPlansClient from './PaymentPlansClient'

export default async function PaymentPlansPage() {
  const plans = await prisma.paymentPlan.findMany({
    include: {
      scheduleItems: {
        orderBy: { stepNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <PaymentPlansClient initialPlans={plans} />
}
