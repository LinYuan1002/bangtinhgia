import React, { forwardRef } from 'react'
import { formatVND, formatArea, formatPricePerM2 } from '@/lib/calculations'

export type QuotePreviewProps = {
  unit: any
  policy?: any | null
  policies?: any[]
  paymentPlan: any | null
  schedules: any[]
  basePrice: number
  finalPrice: number
  totalDiscount: number
  discountBreakdown?: { label: string; percent?: number; amount: number }[]
  discountMode?: string
  loanAmount?: number
  equityAmount?: number
  interestRate?: number
  loanTerm?: number
  monthlyPayment?: number
  bankName?: string
  repaymentMethod?: string
  supportRate?: number
  supportPeriodMonths?: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  salesName?: string
  salesPhone?: string
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>((props, ref) => {
  const {
    unit,
    policy,
    policies = [],
    paymentPlan,
    schedules = [],
    basePrice,
    finalPrice,
    totalDiscount,
    discountBreakdown = [],
    discountMode = 'STACKED',
    loanAmount,
    equityAmount,
    interestRate = 8.5,
    loanTerm = 240,
    monthlyPayment,
    bankName = 'Vietcombank',
    repaymentMethod = 'EQUAL_PAYMENT',
    supportRate = 0,
    supportPeriodMonths = 18,
    customerName,
    customerPhone,
    customerEmail,
    salesName,
    salesPhone,
  } = props

  const date = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const building = unit?.buildingCode || unit?.building || 'S1'
  const floor = unit?.floorNumber || unit?.floor || 1
  const unitType = unit?.unitTypeName || unit?.unitType || '1PN'
  const area = unit?.area || 0
  const grossArea = area > 0 ? (area * 1.08).toFixed(1) : '—' // Tim tường ước tính ~1.08x

  // Financial calculations: Base price includes VAT (10%) and KPBT (2%) => Total factor 1.12
  const netPrice = basePrice > 0 ? Math.round(basePrice / 1.12) : 0
  const vatAmount = basePrice > 0 ? Math.round(netPrice * 0.10) : 0
  const maintenanceFee = basePrice > 0 ? Math.round(netPrice * 0.02) : 0

  // Calculate cumulative schedules
  let runPercent = 0
  let runAmount = 0
  const enrichedSchedules = schedules.map((s) => {
    const pct = Number(s.percentage || s.percentValue || 0)
    const amt = Number(s.amount || 0)
    runPercent += pct
    runAmount += amt
    return {
      ...s,
      percentage: pct,
      amount: amt,
      cumPercent: runPercent,
      cumAmount: runAmount,
    }
  })

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 p-8 sm:p-10 font-sans leading-normal text-slate-900 mx-auto"
      style={{
        width: '100%',
        maxWidth: '820px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
      }}
    >
      {/* ── 1. HEADER ── */}
      <div className="page-break-avoid border-b-2 border-slate-900 pb-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-1.5">
              <span>★</span> TẬP ĐOÀN SUN GROUP • SUN URBAN CITY HÀ NAM
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              BẢNG DỰ TOÁN BÁO GIÁ BÁN HÀNG
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Dự án: <strong>Sun Urban City</strong> • Khu đô thị nghỉ dưỡng ngoại ô kiểu mẫu phía Nam Thủ đô
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>Ngày lập phiếu: <strong className="text-slate-900">{date}</strong></div>
            <div>Mã căn hộ: <strong className="font-mono text-blue-700 text-sm font-black">{unit?.unitCode || '—'}</strong></div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Hiệu lực: 03 ngày làm việc</div>
          </div>
        </div>
      </div>

      {/* ── 2. CUSTOMER & SALES AGENT INFO ── */}
      <div className="page-break-avoid grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
            Thông Tin Khách Hàng
          </span>
          <div className="text-sm font-bold text-slate-900">
            {customerName || 'Quý Khách Hàng'}
          </div>
          <div className="text-slate-700">
            Số điện thoại: <strong>{customerPhone || '—'}</strong>
          </div>
          {customerEmail && (
            <div className="text-slate-600">
              Email: <span>{customerEmail}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 border-l border-slate-200 pl-4">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
            Chuyên Viên Tư Vấn Dự Án
          </span>
          <div className="text-sm font-bold text-slate-900">
            {salesName || 'Chuyên viên Tư vấn Sun Group'}
          </div>
          <div className="text-slate-700">
            Số điện thoại: <strong>{salesPhone || '—'}</strong>
          </div>
          <div className="text-slate-500 text-[11px]">Ban Kinh Doanh & Phân Phối BĐS Sun Group</div>
        </div>
      </div>

      {/* ── 3. DETAILED UNIT SPECIFICATIONS ── */}
      <div className="page-break-avoid mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
          Thông Tin Chi Tiết Căn Hộ
        </h2>
        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden border-collapse">
          <tbody>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <td className="p-2.5 font-medium text-slate-500 w-1/4">Mã căn hộ:</td>
              <td className="p-2.5 font-black text-blue-700 font-mono text-sm">{unit?.unitCode || '—'}</td>
              <td className="p-2.5 font-medium text-slate-500 w-1/4">Vị trí Tòa / Tầng:</td>
              <td className="p-2.5 font-bold text-slate-900">Tòa {building} - Tầng {floor}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2.5 font-medium text-slate-500">Loại hình sản phẩm:</td>
              <td className="p-2.5 font-semibold text-slate-900">{unitType}</td>
              <td className="p-2.5 font-medium text-slate-500">Phòng ngủ / Vệ sinh:</td>
              <td className="p-2.5 font-semibold text-slate-900">
                {unit?.bedrooms || 1} PN • {unit?.bathrooms || 1} WC
              </td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <td className="p-2.5 font-medium text-slate-500">Diện tích thông thủy (NSA):</td>
              <td className="p-2.5 font-bold text-slate-900 text-sm text-blue-700">{formatArea(area)}</td>
              <td className="p-2.5 font-medium text-slate-500">Diện tích tim tường (GSA ước tính):</td>
              <td className="p-2.5 font-medium text-slate-700">{grossArea} m²</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2.5 font-medium text-slate-500">Hướng ban công / Hướng cửa:</td>
              <td className="p-2.5 text-slate-800">{unit?.direction || 'Theo bản vẽ thiết kế'}</td>
              <td className="p-2.5 font-medium text-slate-500">Tầm nhìn cảnh quan (View):</td>
              <td className="p-2.5 font-semibold text-slate-900">{unit?.view || 'Công viên & tiện ích nội khu'}</td>
            </tr>
            <tr>
              <td className="p-2.5 font-medium text-slate-500">Tiêu chuẩn bàn giao:</td>
              <td colSpan={3} className="p-2.5 text-slate-700">
                Hoàn thiện cao cấp liền tường tiêu chuẩn Sun Group (Sàn gỗ, thiết bị vệ sinh, trần thạch cao, hệ cửa nhôm kính cao cấp)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 4. PRICING BREAKDOWN & DISCOUNT STRUCTURE ── */}
      <div className="page-break-avoid mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
          Cơ Cấu Giá Bán & Chính Sách Chiết Khấu Toàn Diện
        </h2>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          {/* Price Before Tax Details */}
          <div className="space-y-1.5 pb-2 border-b border-slate-200 text-slate-600">
            <div className="flex justify-between items-center">
              <span>• Giá bán thuần trước thuế & phí (chưa VAT & KPBT):</span>
              <span className="font-medium text-slate-800">{formatVND(netPrice)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>• Thuế Giá Trị Gia Tăng (VAT 10%):</span>
              <span>+{formatVND(vatAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>• Kinh phí bảo trì phần sở hữu chung (KPBT 2%):</span>
              <span>+{formatVND(maintenanceFee)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200 text-sm">
            <span className="font-bold text-slate-700">GIÁ BÁN NIÊM YẾT CHỦ ĐẦU TƯ (GỒM VAT & KPBT):</span>
            <span className="font-extrabold text-slate-900 text-base">{formatVND(basePrice)}</span>
          </div>

          {((policies && policies.length > 0) || policy) && (
            <div className="text-[11px] text-blue-900 bg-blue-50/90 p-3 rounded-xl border border-blue-100 my-1 space-y-1.5">
              <div className="flex justify-between items-center pb-1 border-b border-blue-200/50">
                <span className="font-bold text-blue-950 uppercase tracking-wide text-[10px] flex items-center gap-1">
                  <span>🏷️</span> Chính sách bán hàng áp dụng ({(policies && policies.length > 0 ? policies : [policy]).length} chính sách):
                </span>
                <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded text-blue-800 font-bold">
                  Quy tắc: {discountMode === 'SEQUENTIAL' ? 'Lũy kế từng phần' : 'Cộng dồn chiết khấu'}
                </span>
              </div>
              <div className="space-y-1 pt-0.5">
                {(policies && policies.length > 0 ? policies : [policy]).map((p: any, idx: number) => (
                  <div key={p.id || idx} className="flex items-start gap-1.5 pl-1">
                    <span className="text-blue-600 font-bold">•</span>
                    <div>
                      <strong className="text-slate-900 font-bold">{p.name}</strong>
                      {p.description && <span className="text-slate-600"> — {p.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount Breakdown list */}
          {discountBreakdown.length > 0 ? (
            discountBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-700 pl-3">
                <span>
                  • {item.label} {item.percent ? `(${item.percent}%)` : ''}:
                </span>
                <span className="font-semibold text-emerald-700">-{formatVND(item.amount)}</span>
              </div>
            ))
          ) : totalDiscount > 0 ? (
            <div className="flex justify-between items-center text-slate-700 pl-3">
              <span>• Chiết khấu ưu đãi chính sách:</span>
              <span className="font-semibold text-emerald-700">-{formatVND(totalDiscount)}</span>
            </div>
          ) : null}

          {totalDiscount > 0 && (
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-emerald-700 font-bold">
              <span>TỔNG GIÁ TRỊ CHIẾT KHẤU & QUÀ TẶNG CĐT:</span>
              <span className="text-sm">-{formatVND(totalDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 pb-1 border-t-2 border-slate-900 text-slate-900 font-black text-sm">
            <span className="uppercase text-slate-900 tracking-wide">
              GIÁ BÁN THỰC TẾ HỢP ĐỒNG (SAU CHIẾT KHẤU):
            </span>
            <span className="text-blue-700 text-xl font-black">{formatVND(finalPrice)}</span>
          </div>

          {area > 0 && (
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
              <span>Đơn giá thông thủy niêm yết: <strong>{formatPricePerM2(basePrice / area)}</strong></span>
              <span>Đơn giá thông thủy thực tế: <strong className="text-emerald-700 font-bold">{formatPricePerM2(finalPrice / area)}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. DETAILED PAYMENT SCHEDULE ── */}
      {paymentPlan && enrichedSchedules.length > 0 && (
        <div className="page-break-avoid mb-5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Tiến Độ Thanh Toán ({paymentPlan.name})
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              Phân loại: {paymentPlan.type === 'LOAN' ? 'Vay ngân hàng' : paymentPlan.type === 'FAST' ? 'Thanh toán sớm' : 'Tiến độ chuẩn'}
            </span>
          </div>

          <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-center">
                <th className="border p-2 w-10">Đợt</th>
                <th className="border p-2 text-left">Nội dung thanh toán</th>
                <th className="border p-2 w-14">Tỷ lệ</th>
                <th className="border p-2 w-16">Lũy kế</th>
                <th className="border p-2 text-right w-32">Số tiền (VNĐ)</th>
                <th className="border p-2 text-right w-32">Số tiền lũy kế</th>
                <th className="border p-2 text-left w-36">Thời điểm thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {enrichedSchedules.map((s, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                  <td className="border p-2 text-center font-bold text-slate-600">{idx + 1}</td>
                  <td className="border p-2 font-medium text-slate-800">{s.name || s.stepName}</td>
                  <td className="border p-2 text-center font-semibold text-blue-700">
                    {s.percentage}%
                  </td>
                  <td className="border p-2 text-center text-slate-500 font-medium">
                    {s.cumPercent}%
                  </td>
                  <td className="border p-2 text-right font-bold text-slate-900">
                    {formatVND(s.amount)}
                  </td>
                  <td className="border p-2 text-right text-slate-600 font-medium text-[11px]">
                    {formatVND(s.cumAmount)}
                  </td>
                  <td className="border p-2 text-slate-600 text-[11px]">
                    {s.dueDateNote || s.timePoint || 'Theo thông báo CĐT'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                <td colSpan={2} className="border p-2 text-right uppercase text-slate-800">
                  TỔNG CỘNG:
                </td>
                <td className="border p-2 text-center text-blue-700 font-bold">100%</td>
                <td className="border p-2 text-center text-blue-700 font-bold">100%</td>
                <td className="border p-2 text-right text-blue-700 text-sm">{formatVND(finalPrice)}</td>
                <td className="border p-2 text-right text-blue-700 text-sm">{formatVND(finalPrice)}</td>
                <td className="border p-2 text-emerald-700 font-bold text-[11px]">Hoàn tất thanh toán</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── 6. BANK LOAN ESTIMATION ── */}
      {paymentPlan?.type === 'LOAN' && loanAmount && loanAmount > 0 && (
        <div className="page-break-avoid mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
            Phương Án Vay Vốn & Hỗ Trợ Lãi Suất Ngân Hàng
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-2">
            <div>
              <span className="text-slate-500 text-[11px] block">Ngân hàng liên kết:</span>
              <strong className="text-slate-900 text-sm">{bankName || 'Vietcombank'}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Vốn tự có (30%):</span>
              <strong className="text-slate-900 text-sm">{formatVND(equityAmount || 0)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Hạn mức vay (70%):</span>
              <strong className="text-blue-700 text-sm font-black">{formatVND(loanAmount)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Thời hạn vay tối đa:</span>
              <strong className="text-slate-900 text-sm">{loanTerm ? `${loanTerm / 12} năm (${loanTerm} tháng)` : '20 năm'}</strong>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl text-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-blue-950">Chính sách ưu đãi: </span>
                <span className="text-emerald-700 font-bold">
                  Hỗ trợ lãi suất {supportRate}% trong {supportPeriodMonths} tháng & Ân hạn nợ gốc
                </span>
              </div>
              <div className="text-slate-600 text-[11px]">
                Phương thức: <strong>{repaymentMethod === 'EQUAL_PRINCIPAL' ? 'Dư nợ giảm dần' : 'Niên kim đều (PMT)'}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-100 text-slate-700">
              <div>Lãi suất tham chiếu sau ưu đãi: <strong>{interestRate}%/năm</strong></div>
              <div className="text-right">
                <span className="text-slate-600 mr-1.5">Gốc + lãi dự kiến trả hàng tháng sau ưu đãi:</span>
                <strong className="text-blue-800 text-sm font-black">{formatVND(monthlyPayment || 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. OFFICIAL DEPOSIT BANK ACCOUNT ── */}
      {(() => {
        const unitTypeNorm = (unit?.unitTypeName || unit?.unitType || '').toUpperCase()
        let requiredDeposit = 100000000
        if (unitTypeNorm.includes('STUDIO')) {
          requiredDeposit = 50000000
        } else if (unitTypeNorm.includes('2BR') || unitTypeNorm.includes('2PN')) {
          requiredDeposit = 150000000
        } else if (unitTypeNorm.includes('1BR') || unitTypeNorm.includes('1PN')) {
          requiredDeposit = 100000000
        }

        return (
          <div className="page-break-avoid mb-5 bg-amber-50/90 border border-amber-300 rounded-xl p-4 text-xs shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200">
              <h3 className="font-black text-amber-950 uppercase tracking-wide text-xs flex items-center gap-1.5">
                <span>🏛️</span> Thông Tin Nhận Cọc Chính Thức
              </h3>
              <div className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[11px]">
                Số tiền cọc căn này: <span className="text-rose-700 font-black">{formatVND(requiredDeposit)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Tên tài khoản thụ hưởng:</span>
                <strong className="text-slate-900 font-bold block text-sm">Công ty cổ phần đầu tư và thương mại Vhomes</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Số tài khoản Techcombank:</span>
                <strong className="text-blue-700 font-mono text-base font-black tracking-wider block">19133023958016</strong>
                <span className="text-[11px] text-slate-600">Techcombank - Chi nhánh Hà Thành</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200 text-[11px] space-y-0.5">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Quy định mức tiền cọc:</span>
                <div>• Studio: <strong>50 triệu đồng</strong></div>
                <div>• 1BR+1: <strong>100 triệu đồng</strong></div>
                <div>• 2BR: <strong>150 triệu đồng</strong></div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-amber-200 text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                Nội dung chuyển khoản chuẩn: <strong className="font-mono text-blue-900 bg-amber-100/80 px-2 py-0.5 rounded font-bold">{customerName || '<Tên khách hàng>'} dat coc {unit?.unitCode || '<Mã căn>'} du an Sun Urban City</strong>
              </div>
              <span className="text-[10px] text-slate-500 italic">* Chụp lại biên lai gửi chuyên viên để xác nhận lock căn.</span>
            </div>
          </div>
        )
      })()}

      {/* ── 8. DISCLAIMER & NOTES ── */}
      <div className="page-break-avoid pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1 mb-5">
        <p className="italic">
          * Phiếu dự toán báo giá được lập tự động từ Hệ Thống Tính Giá Bất Động Sản Sun Urban City có giá trị trong vòng 03 ngày làm việc kể từ ngày lập.
        </p>
        <p className="italic">
          * Quyền lợi, nghĩa vụ, tiến độ thanh toán và giá trị pháp lý chính thức căn cứ theo Hợp Đồng Mua Bán ký kết trực tiếp giữa Quý khách hàng và Chủ đầu tư.
        </p>
      </div>

      {/* ── 9. SIGNATURES ── */}
      <div className="page-break-avoid grid grid-cols-2 gap-8 text-center text-xs pt-3">
        <div>
          <div className="font-bold uppercase text-slate-800 tracking-wide mb-14">
            Đại diện Chuyên viên Tư vấn
          </div>
          <div className="font-bold text-slate-900 text-sm">{salesName || 'Chuyên viên Tư vấn'}</div>
          <div className="text-[11px] text-slate-500">{salesPhone || 'Sun Group Official'}</div>
        </div>
        <div>
          <div className="font-bold uppercase text-slate-800 tracking-wide mb-14">
            Xác nhận của Khách hàng
          </div>
          <div className="font-bold text-slate-900 text-sm">{customerName || 'Quý Khách Hàng'}</div>
          <div className="text-[11px] text-slate-500">{customerPhone || ''}</div>
        </div>
      </div>
    </div>
  )
})

QuotePreview.displayName = 'QuotePreview'
