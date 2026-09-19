import { prisma } from '@/lib/prisma'
import LoanProgramsClient from './LoanProgramsClient'

export default async function LoanProgramsPage() {
  const programs = await prisma.loanProgram.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return <LoanProgramsClient initialPrograms={programs} />
}
