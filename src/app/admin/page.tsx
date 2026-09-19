import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  try {
    const [totalUnits, byStatus, recentQuotes, recentImports] = await Promise.all([
      prisma.unit.count(),
      prisma.unit.groupBy({ by: ['status'], _count: true }),
      prisma.quote.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.importBatch.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    ])
    return { totalUnits, byStatus, recentQuotes, recentImports }
  } catch {
    return { totalUnits: 0, byStatus: [], recentQuotes: [], recentImports: [] }
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const statusMap: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: 'Còn hàng', color: 'bg-green-100 text-green-700' },
    HOLD: { label: 'Đang giữ', color: 'bg-yellow-100 text-yellow-700' },
    SOLD: { label: 'Đã bán', color: 'bg-red-100 text-red-700' },
    LOCKED: { label: 'Khóa', color: 'bg-gray-100 text-gray-700' },
    UNAVAILABLE: { label: 'Không bán', color: 'bg-slate-100 text-slate-500' },
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Tổng quan</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng căn hộ" value={stats.totalUnits.toString()} icon="🏢" />
        {stats.byStatus.map((s: any) => {
          const meta = statusMap[s.status] ?? { label: s.status, color: 'bg-slate-100 text-slate-700' }
          return (
            <StatCard
              key={s.status}
              label={meta.label}
              value={s._count.toString()}
              icon="•"
              colorClass={meta.color}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">📄 Báo giá gần đây</h2>
          {stats.recentQuotes.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có báo giá nào</p>
          ) : (
            <div className="space-y-2">
              {stats.recentQuotes.map((q: any) => (
                <div key={q.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 truncate">{q.customerName || 'Khách hàng'}</span>
                  <span className="text-slate-400 text-xs">
                    {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Imports */}
        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">📥 Import gần đây</h2>
          {stats.recentImports.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có lần import nào</p>
          ) : (
            <div className="space-y-2">
              {stats.recentImports.map((b: any) => (
                <div key={b.id} className="text-sm py-1.5 border-b border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-600 truncate">{b.fileName}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        b.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-600'
                          : b.status === 'FAILED'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {b.successRows}/{b.totalRows} dòng thành công
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  colorClass = 'bg-blue-50 text-blue-700',
}: {
  label: string
  value: string
  icon: string
  colorClass?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  )
}
