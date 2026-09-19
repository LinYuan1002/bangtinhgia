import { NextResponse } from 'next/server'
import { ensureDatabaseSchema, seedInitialDataIfEmpty, getTursoClient } from '@/lib/db-init'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = getTursoClient()
    const isTursoConfigured = !!client

    const initResult = await ensureDatabaseSchema(client || undefined)

    if (initResult.success) {
      await seedInitialDataIfEmpty(client || undefined)
    }

    // Query current counts from Prisma or client
    let counts = { units: 0, policies: 0, paymentPlans: 0, loanPrograms: 0, quotes: 0 }
    try {
      const [u, p, pl, lp, q] = await Promise.all([
        prisma.unit.count(),
        prisma.policy.count(),
        prisma.paymentPlan.count(),
        prisma.loanProgram.count(),
        prisma.quote.count(),
      ])
      counts = { units: u, policies: p, paymentPlans: pl, loanPrograms: lp, quotes: q }
    } catch (e: any) {
      console.warn('[setup-db] Prisma count note:', e.message)
    }

    return NextResponse.json({
      status: 'ok',
      isTursoConfigured,
      schemaResult: initResult,
      dataCounts: counts,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: err.message || String(err),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action } = body

    const client = getTursoClient()
    const initResult = await ensureDatabaseSchema(client || undefined)

    if (action === 'clear-samples') {
      // Delete all sample units
      const sampleCodes = ['S1-0612', 'S1-0615', 'S1-1205', 'S2-0810', 'S2-2001']
      const deleted = await prisma.unit.deleteMany({
        where: {
          OR: [
            { unitCode: { in: sampleCodes } },
            { id: { startsWith: 'fb-' } },
            { id: { startsWith: 'unit-s' } },
          ],
        },
      })
      return NextResponse.json({
        success: true,
        message: `Đã xóa thành công ${deleted.count} căn hộ mẫu. CSDL hiện đã sạch để nhập căn thật.`,
        deletedCount: deleted.count,
      })
    }

    if (action === 'seed') {
      await seedInitialDataIfEmpty(client || undefined)
      return NextResponse.json({
        success: true,
        message: 'Đã nạp lại dữ liệu mẫu thành công.',
      })
    }

    return NextResponse.json({
      success: true,
      initResult,
      message: 'Đã khởi tạo và đồng bộ bảng CSDL Turso thành công!',
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || String(err),
      },
      { status: 500 }
    )
  }
}
