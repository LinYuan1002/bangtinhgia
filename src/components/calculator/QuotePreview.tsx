import React, { forwardRef } from 'react'
import { formatVND, formatArea, formatPricePerM2 } from '@/lib/calculations'

export type QuotePreviewProps = {
  unit: any
  policy: any | null
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
    paymentPlan,
    schedules = [],
    basePrice,
    finalPrice,
    totalDiscount,
    discountBreakdown = [],
    discountMode = 'STACKED',
    loanAmount,
    equityAmount,
    interestRate,
    loanTerm,
    monthlyPayment,
    bankName,
    repaymentMethod,
    supportRate,
    supportPeriodMonths,
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

  const building = unit?.buildingCode || unit?.building || '—'
  const floor = unit?.floorNumber || unit?.floor || '—'
  const unitType = unit?.unitTypeName || unit?.unitType || '—'
  const area = unit?.area || 0

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 p-8 rounded-xl font-sans"
      style={{
        width: '800px',
        minHeight: '1130px',
        boxSizing: 'border-box',
        color: '#0f172a',
        backgroundColor: '#ffffff',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-1">
            TẬP ĐOÀN SUN GROUP • SUN URBAN CITY
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            BẢNG DỰ TOÁN BÁO GIÁ BÁN HÀNG
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dự án: <strong>Sun Urban City Hà Nam</strong> • Đô thị nghỉ dưỡng ngoại ô
          </p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-1">
          <div>Ngày lập phiếu: <strong>{date}</strong></div>
          <div>Mã căn hộ: <strong className="font-mono text-blue-700 text-sm">{unit?.unitCode || '—'}</strong></div>
          <div className="text-[11px] text-slate-400">Phòng Kinh Doanh & Phân Phối</div>
        </div>
      </div>

      {/* ── 1. CUSTOMER & SALES INFORMATION ── */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
            Thông Tin Khách Hàng
          </span>
          <div className="text-sm font-bold text-slate-900">
            {customerName || 'Quý khách hàng'}
          </div>
          <div>
            Số điện thoại: <strong>{customerPhone || '—'}</strong>
          </div>
          {customerEmail && (
            <div>
              Email: <span>{customerEmail}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 border-l border-slate-200 pl-4">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
            Chuyên Viên Tư Vấn
          </span>
          <div className="text-sm font-bold text-slate-900">
            {salesName || 'Tư vấn viên Sun Group'}
          </div>
          <div>
            Số điện thoại: <strong>{salesPhone || '—'}</strong>
          </div>
          <div className="text-slate-500 text-[11px]">Ban Kinh Doanh Dự Án</div>
        </div>
      </div>

      {/* ── 2. UNIT SPECIFICATIONS ── */}
      <div className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
          Thông Tin Chi Tiết Bất Động Sản
        </h2>
        <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="p-2.5 font-medium text-slate-500 w-1/4">Mã căn hộ:</td>
              <td className="p-2.5 font-bold text-blue-700 font-mono text-sm">{unit?.unitCode || '—'}</td>
              <td className="p-2.5 font-medium text-slate-500 w-1/4">Tòa / Tầng:</td>
              <td className="p-2.5 font-semibold text-slate-900">Tòa {building} - Tầng {floor}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="p-2.5 font-medium text-slate-500">Loại căn:</td>
              <td className="p-2.5 font-semibold text-slate-900">{unitType}</td>
              <td className="p-2.5 font-medium text-slate-500">Diện tích thông thủy:</td>
              <td className="p-2.5 font-bold text-slate-900">{formatArea(area)}</td>
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="p-2.5 font-medium text-slate-500">Hướng ban công:</td>
              <td className="p-2.5 text-slate-800">{unit?.direction || 'Theo thiết kế'}</td>
              <td className="p-2.5 font-medium text-slate-500">Tầm nhìn (View):</td>
              <td className="p-2.5 text-slate-800">{unit?.view || 'Nội khu'}</td>
            </tr>
            <tr>
              <td className="p-2.5 font-medium text-slate-500">Đơn giá niêm yết:</td>
              <td className="p-2.5 font-semibold text-slate-700">
                {formatPricePerM2(area > 0 ? basePrice / area : 0)}
              </td>
              <td className="p-2.5 font-medium text-slate-500">Đơn giá sau ưu đãi:</td>
              <td className="p-2.5 font-bold text-emerald-700">
                {formatPricePerM2(area > 0 ? finalPrice / area : 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 3. PRICING & DETAILED DISCOUNT BREAKDOWN ── */}
      <div className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
          Bảng Dự Toán Giá Bán & Chiết Khấu
        </h2>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-200 text-sm">
            <span className="font-semibold text-slate-700">Giá bán niêm yết (Đã gồm VAT & KPBT):</span>
            <span className="font-bold text-slate-900 text-base">{formatVND(basePrice)}</span>
          </div>

          {policy && (
            <div className="text-[11px] text-blue-800 bg-blue-50/80 p-2 rounded border border-blue-100">
              <strong>Chính sách áp dụng:</strong> {policy.name}
              {policy.description && ` — ${policy.description}`}
              <span className="ml-2 text-slate-500">
                (Quy tắc tính: {discountMode === 'SEQUENTIAL' ? 'Lũy kế' : 'Cộng dồn'})
              </span>
            </div>
          )}

          {/* Detailed breakdown list */}
          {discountBreakdown.length > 0 ? (
            discountBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600 pl-3">
                <span>
                  • {item.label} {item.percent ? `(${item.percent}%)` : ''}:
                </span>
                <span className="font-medium text-emerald-700">-{formatVND(item.amount)}</span>
              </div>
            ))
          ) : totalDiscount > 0 ? (
            <div className="flex justify-between items-center text-slate-600 pl-3">
              <span>• Chiết khấu ưu đãi:</span>
              <span className="font-medium text-emerald-700">-{formatVND(totalDiscount)}</span>
            </div>
          ) : null}

          {totalDiscount > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-emerald-700 font-bold">
              <span>TỔNG GIÁ TRỊ CHIẾT KHẤU & QUÀ TẶNG:</span>
              <span className="text-sm">-{formatVND(totalDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2.5 pb-1 border-t-2 border-slate-900 text-slate-900 font-extrabold text-sm">
            <span className="uppercase text-slate-800">GIÁ BÁN THỰC TẾ HỢP ĐỒNG (SAU CHIẾT KHẤU):</span>
            <span className="text-blue-700 text-lg">{formatVND(finalPrice)}</span>
          </div>
        </div>
      </div>

      {/* ── 4. PAYMENT SCHEDULE ── */}
      {paymentPlan && schedules.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Tiến Độ Thanh Toán ({paymentPlan.name})
            </h2>
            <span className="text-[11px] text-slate-500">Loại: {paymentPlan.type}</span>
          </div>

          <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="border p-2 text-left w-12 text-center">Đợt</th>
                <th className="border p-2 text-left">Nội dung thanh toán</th>
                <th className="border p-2 text-right w-16">Tỷ lệ</th>
                <th className="border p-2 text-right w-36">Số tiền (VNĐ)</th>
                <th className="border p-2 text-left w-36">Thời điểm thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                  <td className="border p-2 text-center font-semibold text-slate-500">{idx + 1}</td>
                  <td className="border p-2 font-medium text-slate-800">{s.name || s.stepName}</td>
                  <td className="border p-2 text-right font-semibold text-blue-600">
                    {s.percentage || s.percentValue}%
                  </td>
                  <td className="border p-2 text-right font-bold text-slate-900">
                    {formatVND(s.amount)}
                  </td>
                  <td className="border p-2 text-slate-600 text-[11px]">
                    {s.dueDateNote || s.timePoint || 'Theo thông báo CĐT'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t border-slate-300">
                <td colSpan={2} className="border p-2 text-right uppercase text-slate-700">
                  Tổng cộng:
                </td>
                <td className="border p-2 text-right text-blue-700">100%</td>
                <td className="border p-2 text-right text-blue-700">{formatVND(finalPrice)}</td>
                <td className="border p-2 text-slate-500 text-[11px]">Hoàn thành thanh toán</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. BANK LOAN FINANCIAL ESTIMATION ── */}
      {paymentPlan?.type === 'LOAN' && loanAmount && loanAmount > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
            Phương Án Vay Vốn Ngân Hàng Đối Tác
          </h2>

          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-2">
            <div>
              <span className="text-slate-500 text-[11px] block">Ngân hàng hỗ trợ:</span>
              <strong className="text-slate-900">{bankName || 'Ngân hàng đối tác'}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Vốn tự có (30%):</span>
              <strong className="text-slate-900">{formatVND(equityAmount || 0)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Hạn mức vay (70%):</span>
              <strong className="text-blue-700">{formatVND(loanAmount)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Thời hạn vay:</span>
              <strong className="text-slate-900">{loanTerm ? `${loanTerm / 12} năm` : '—'}</strong>
            </div>
          </div>

          <div className="flex justify-between items-center bg-blue-50/60 border border-blue-100 p-2.5 rounded-lg text-xs">
            <div>
              <span>Lãi suất: <strong>{interestRate}%/năm</strong></span>
              {supportRate !== undefined && supportPeriodMonths ? (
                <span className="ml-2 text-emerald-700 font-semibold">
                  (HTLS {supportRate}% trong {supportPeriodMonths} tháng)
                </span>
              ) : null}
              <span className="ml-2 text-slate-500">
                • {repaymentMethod === 'EQUAL_PRINCIPAL' ? 'Dư nợ giảm dần' : 'Niên kim (PMT)'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 mr-2">Gốc + lãi dự kiến tháng đầu:</span>
              <strong className="text-blue-800 text-sm font-bold">
                {formatVND(monthlyPayment || 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. DISCLAIMER & NOTES ── */}
      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1 mb-6">
        <p className="italic">
          * Phiếu báo giá được lập tự động từ Hệ Thống Tính Giá Bất Động Sản Sun Urban City và có giá trị tham khảo kế hoạch tài chính.
        </p>
        <p className="italic">
          * Quyền lợi, nghĩa vụ và giá bán chính thức căn cứ theo Hợp Đồng Mua Bán ký kết trực tiếp giữa Quý khách hàng và Chủ đầu tư.
        </p>
      </div>

      {/* ── 7. SIGNATURES ── */}
      <div className="grid grid-cols-2 gap-8 text-center text-xs pt-2">
        <div>
          <div className="font-bold uppercase text-slate-700 mb-14">
            Đại diện Chuyên viên Tư vấn
          </div>
          <div className="font-bold text-slate-900">{salesName || 'Tư vấn viên Sun Group'}</div>
          <div className="text-[11px] text-slate-400">{salesPhone || ''}</div>
        </div>
        <div>
          <div className="font-bold uppercase text-slate-700 mb-14">
            Xác nhận của Khách hàng
          </div>
          <div className="font-bold text-slate-900">{customerName || 'Quý khách hàng'}</div>
          <div className="text-[11px] text-slate-400">{customerPhone || ''}</div>
        </div>
      </div>
    </div>
  )
})

QuotePreview.displayName = 'QuotePreview'
