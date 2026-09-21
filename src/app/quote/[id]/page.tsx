import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatVND } from '@/lib/calculations'
import PrintButton from './PrintButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { id: string }
}

export default async function QuoteViewPage({ params }: Props) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
  })

  if (!quote) {
    notFound()
  }

  // Parse snapshots safely
  let unitData: any = {}
  let policyData: any = null
  let calcData: any = {}
  let paymentData: any = null
  let loanData: any = null

  try {
    unitData = JSON.parse(quote.unitSnapshot || '{}')
  } catch {}
  try {
    if (quote.policySnapshot) policyData = JSON.parse(quote.policySnapshot)
  } catch {}
  try {
    calcData = JSON.parse(quote.calculationSnapshot || '{}')
  } catch {}
  try {
    if (quote.paymentSnapshot) paymentData = JSON.parse(quote.paymentSnapshot)
  } catch {}
  try {
    if (quote.loanSnapshot) loanData = JSON.parse(quote.loanSnapshot)
  } catch {}

  const createdDate = new Date(quote.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:p-0 print:bg-white text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition flex items-center gap-1"
          >
            ← Về công cụ tính giá
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/quotes"
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              Xem tất cả báo giá
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* The Quote Document */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-12 print:shadow-none print:border-none print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-4">
            <div>
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Sun Urban City Hà Nam
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                PHIẾU DỰ TOÁN BÁO GIÁ
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Mã phiếu: <span className="font-mono font-medium text-slate-700">{quote.id}</span> • Ngày lập: {createdDate}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
              <div className="font-bold text-slate-800 text-sm">SUN GROUP OFFICIAL</div>
              <div>Ban Kinh Doanh & Phân Phối BĐS</div>
              <div>Hotline CSKH: 1900 xxxx</div>
            </div>
          </div>

          {/* Customer & Sales Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm">
            <div className="bg-slate-50 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Thông tin Khách hàng
              </span>
              <div className="font-bold text-slate-900 text-base">
                {quote.customerName || 'Quý khách hàng'}
              </div>
              {quote.customerPhone && (
                <div className="text-slate-600">Số điện thoại: {quote.customerPhone}</div>
              )}
              {quote.customerEmail && (
                <div className="text-slate-600">Email: {quote.customerEmail}</div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Chuyên viên Tư vấn
              </span>
              <div className="font-bold text-slate-900 text-base">
                {quote.salesName || 'Chuyên viên tư vấn Sun Group'}
              </div>
              {quote.salesPhone && (
                <div className="text-slate-600">Số điện thoại: {quote.salesPhone}</div>
              )}
              <div className="text-slate-500 text-xs">Phòng Kinh Doanh Dự Án</div>
            </div>
          </div>

          {/* Unit Specifications */}
          <div className="py-6 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              1. Thông tin Bất Động Sản Lựa Chọn
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-xs text-slate-500 block">Mã căn hộ</span>
                <span className="text-lg font-bold text-blue-600 font-mono">
                  {unitData.unitCode || '—'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-xs text-slate-500 block">Tòa / Tầng</span>
                <span className="text-base font-bold text-slate-800">
                  {unitData.buildingCode || unitData.building || '—'} - Tầng {unitData.floorNumber || unitData.floor || '—'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-xs text-slate-500 block">Diện tích thông thủy</span>
                <span className="text-base font-bold text-slate-800">
                  {unitData.area ? `${unitData.area} m²` : '—'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-xs text-slate-500 block">Loại căn hộ</span>
                <span className="text-base font-bold text-slate-800">
                  {unitData.unitTypeName || unitData.unitType || '—'}
                </span>
              </div>
            </div>

            {(unitData.direction || unitData.view) && (
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg flex gap-4">
                {unitData.direction && (
                  <span>
                    <strong>Hướng:</strong> {unitData.direction}
                  </span>
                )}
                {unitData.view && (
                  <span>
                    <strong>Tầm nhìn (View):</strong> {unitData.view}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Discounts Breakdown */}
          <div className="py-6 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              2. Chi Tiết Giá & Chính Sách Chiết Khấu
            </h2>

            {(() => {
              const policyList = Array.isArray(policyData)
                ? policyData
                : policyData
                ? [policyData]
                : []
              if (policyList.length === 0) return null
              return (
                <div className="mb-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold uppercase tracking-wider text-[11px] text-blue-800">
                    {policyList.length > 1
                      ? `Các chính sách ưu đãi áp dụng đồng thời (${policyList.length}):`
                      : 'Chính sách ưu đãi áp dụng:'}
                  </div>
                  <div className="space-y-1">
                    {policyList.map((p: any, idx: number) => (
                      <div key={p.id || idx} className="flex items-start justify-between gap-2 pl-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">•</span>
                          <div>
                            <strong className="text-slate-900">{p.name}</strong>
                            {p.description && <span className="text-slate-600"> — {p.description}</span>}
                          </div>
                        </div>
                        {p.groupName && (
                          <span className="shrink-0 text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                            {p.groupName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Giá bán niêm yết (Gồm VAT & KPBT):</span>
                <span className="font-semibold text-slate-900">{formatVND(quote.snapshotPrice)}</span>
              </div>

              {calcData.discountBreakdown &&
                calcData.discountBreakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-1.5 text-xs text-slate-600">
                    <span className="pl-4">
                      • {item.label} {item.percent ? `(${item.percent}%)` : ''}:
                    </span>
                    <span className="font-medium text-emerald-700">-{formatVND(item.amount)}</span>
                  </div>
                ))}

              <div className="flex justify-between py-1.5 border-b border-slate-100 text-emerald-700 font-semibold">
                <span>Tổng chiết khấu được hưởng:</span>
                <span>-{formatVND(quote.totalDiscount)}</span>
              </div>

              <div className="flex justify-between py-3 bg-slate-900 text-white px-4 rounded-xl text-base font-bold mt-3">
                <span>GIÁ BÁN SAU CHIẾT KHẤU (HĐMB):</span>
                <span className="text-xl text-amber-400">{formatVND(quote.finalPrice)}</span>
              </div>

              {unitData.area && unitData.area > 0 && (
                <div className="text-right text-xs text-slate-500 mt-1">
                  Đơn giá thông thủy tương đương:{' '}
                  <strong>{formatVND(quote.finalPrice / unitData.area)}/m²</strong>
                </div>
              )}
            </div>
          </div>

          {/* Payment Schedule (if available) */}
          {paymentData && paymentData.installments && (
            <div className="py-6 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                3. Tiến Độ Thanh Toán
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200">
                    <tr>
                      <th className="p-2.5">Đợt thanh toán</th>
                      <th className="p-2.5 text-right">Tỷ lệ</th>
                      <th className="p-2.5 text-right">Số tiền (VNĐ)</th>
                      <th className="p-2.5">Thời điểm thanh toán</th>
                      <th className="p-2.5 text-right">Lũy kế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentData.installments.map((inst: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-semibold text-slate-800">{inst.name}</td>
                        <td className="p-2.5 text-right font-medium text-blue-600">
                          {inst.percentage}%
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {formatVND(inst.amount)}
                        </td>
                        <td className="p-2.5 text-slate-600">{inst.dueDateNote || 'Theo thông báo CĐT'}</td>
                        <td className="p-2.5 text-right text-slate-500">
                          {formatVND(inst.cumulativeAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loan Support Section (if available) */}
          {loanData && loanData.monthlyPayment && (
            <div className="py-6 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                4. Phương Án Hỗ Trợ Vay Vốn Ngân Hàng
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-500 block">Số tiền vay (Dự kiến)</span>
                  <span className="font-bold text-sm text-slate-900">
                    {formatVND(loanData.principal || 0)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-500 block">Thời hạn vay</span>
                  <span className="font-bold text-sm text-slate-900">
                    {loanData.loanTermMonths ? `${loanData.loanTermMonths / 12} năm` : '—'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-500 block">Lãi suất tham chiếu</span>
                  <span className="font-bold text-sm text-blue-600">
                    {loanData.annualInterestRate}%/năm
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-500 block">Ước tính trả hàng tháng</span>
                  <span className="font-bold text-sm text-emerald-700">
                    {formatVND(loanData.monthlyPayment)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Official Deposit Info */}
          {(() => {
            const unitTypeNorm = (unitData?.unitTypeName || unitData?.unitType || '').toUpperCase()
            let requiredDeposit = 100000000
            if (unitTypeNorm.includes('STUDIO')) {
              requiredDeposit = 50000000
            } else if (unitTypeNorm.includes('2BR') || unitTypeNorm.includes('2PN')) {
              requiredDeposit = 150000000
            } else if (unitTypeNorm.includes('1BR') || unitTypeNorm.includes('1PN')) {
              requiredDeposit = 100000000
            }

            return (
              <div className="py-6 border-b border-slate-200">
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 text-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <span>🏛️</span> Thông Tin Tài Khoản Nhận Cọc Chính Thức
                    </h2>
                    <div className="px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                      Số tiền cọc quy định: <span className="text-rose-700 font-black">{formatVND(requiredDeposit)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Tên đơn vị thụ hưởng:</span>
                      <strong className="text-slate-900 text-sm font-bold block">Công ty cổ phần đầu tư và thương mại Vhomes</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Số tài khoản Techcombank:</span>
                      <strong className="text-blue-700 font-mono text-base font-black tracking-wider block">19133023958016</strong>
                      <span className="text-slate-600 text-[11px]">Techcombank - Chi nhánh Hà Thành</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px] space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Quy định mức tiền cọc:</span>
                      <div>• Studio: <strong>50 triệu đồng</strong></div>
                      <div>• 1BR+1: <strong>100 triệu đồng</strong></div>
                      <div>• 2BR: <strong>150 triệu đồng</strong></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200 text-[11px] text-slate-700">
                    Cú pháp chuyển cọc chuẩn:{' '}
                    <strong className="font-mono text-blue-900 bg-amber-100/80 px-2 py-0.5 rounded font-bold">
                      {quote.customerName || '<Tên khách hàng>'} dat coc {unitData?.unitCode || '<Mã căn>'} du an Sun Urban City
                    </strong>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Immutability & Disclaimer notice */}
          <div className="pt-8 text-xs text-slate-500 space-y-2">
            <p className="italic">
              * Lưu ý: Phiếu báo giá này được xuất tự động từ hệ thống tại thời điểm <strong>{createdDate}</strong>.
              Tất cả các điều khoản, giá bán và chính sách ưu đãi được ghi nhận dưới dạng Snapshot bất biến tại thời điểm lập phiếu.
            </p>
            <p className="italic">
              * Báo giá có giá trị tham khảo để lập kế hoạch tài chính. Giá trị pháp lý chính thức sẽ căn cứ theo Hợp Đồng Mua Bán ký kết giữa hai bên.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
            <div>
              <div className="font-bold text-slate-800 uppercase mb-16">Đại diện Chuyên viên Tư vấn</div>
              <div className="font-semibold text-slate-900">{quote.salesName || 'Chuyên viên tư vấn'}</div>
            </div>
            <div>
              <div className="font-bold text-slate-800 uppercase mb-16">Xác nhận Khách hàng</div>
              <div className="font-semibold text-slate-900">{quote.customerName || 'Khách hàng'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
