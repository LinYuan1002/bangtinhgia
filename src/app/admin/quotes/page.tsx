import { prisma } from '@/lib/prisma'
import { formatVND } from '@/lib/calculations'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function QuotesAdminPage() {
  const quotes = await prisma.quote.findMany({
    include: {
      unit: {
        select: {
          unitCode: true,
          buildingCode: true,
          floorNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Quản lý Báo Giá (Quote Snapshots)</h1>
        <p className="text-sm text-slate-500">
          Danh sách các phiếu tính giá đã tạo cho khách hàng. Mỗi phiếu là một snapshot bất biến.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Mã căn</th>
                <th className="p-3 text-right">Giá niêm yết</th>
                <th className="p-3 text-right">Chiết khấu</th>
                <th className="p-3 text-right">Giá cuối (HĐ)</th>
                <th className="p-3">Chuyên viên sales</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Chưa có báo giá nào được tạo.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {q.customerName || 'Khách vãng lai'}
                      {q.customerPhone && (
                        <div className="text-[11px] text-slate-400 font-normal">{q.customerPhone}</div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-blue-600">
                      {q.unit?.unitCode || '—'}
                    </td>
                    <td className="p-3 text-right text-slate-500 font-medium">
                      {formatVND(q.snapshotPrice)}
                    </td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">
                      -{formatVND(q.totalDiscount)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatVND(q.finalPrice)}
                    </td>
                    <td className="p-3 text-slate-600">
                      {q.salesName || '—'}
                      {q.salesPhone && (
                        <span className="text-slate-400 ml-1">({q.salesPhone})</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link
                        href={`/quote/${q.id}`}
                        target="_blank"
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition inline-block"
                      >
                        Xem phiếu ↗
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
