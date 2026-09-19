import { prisma } from '@/lib/prisma'
import { formatVND } from '@/lib/calculations'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PriceHistoryPage() {
  const history = await prisma.priceHistory.findMany({
    include: {
      unit: {
        select: {
          unitCode: true,
          buildingCode: true,
          floorNumber: true,
          area: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Lịch sử Điều chỉnh Giá (Price History)</h1>
        <p className="text-sm text-slate-500">
          Nhật ký bất biến ghi nhận mọi thay đổi giá bán căn hộ trong hệ thống
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Mã căn</th>
                <th className="p-3">Tòa / Tầng</th>
                <th className="p-3 text-right">Giá cũ</th>
                <th className="p-3 text-center">→</th>
                <th className="p-3 text-right">Giá mới</th>
                <th className="p-3 text-right">Chênh lệch</th>
                <th className="p-3">Lý do điều chỉnh</th>
                <th className="p-3">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Chưa có lịch sử thay đổi giá nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const diff = h.newPrice - h.oldPrice
                  const isUp = diff > 0
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {h.unit?.unitCode || 'Căn hộ đã xóa'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {h.unit ? `${h.unit.buildingCode} - Tầng ${h.unit.floorNumber}` : '—'}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-500">
                        {formatVND(h.oldPrice)}
                      </td>
                      <td className="p-3 text-center text-slate-400">→</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatVND(h.newPrice)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded ${
                            isUp ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {formatVND(diff)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate" title={h.reason}>
                        {h.reason || '—'}
                      </td>
                      <td className="p-3 text-slate-500">{h.changedBy || 'Admin'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
