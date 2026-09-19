import { prisma } from '@/lib/prisma'
import LoanProgramsClient from './LoanProgramsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LoanProgramsPage() {
  let programs: any[] = []
  try {
    programs = await prisma.loanProgram.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.warn('[LoanProgramsPage] Failed to fetch:', err)
  }

  return <LoanProgramsClient initialPrograms={programs} />
}
