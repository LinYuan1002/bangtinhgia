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
  quoteResult?: any
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
    quoteResult,
  } = props

  const date = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const building = unit?.buildingCode || unit?.building || 'P12'
  const floor = unit?.floorNumber || unit?.floor || 1
  const unitType = unit?.unitTypeName || unit?.unitType || '1PN'
  const area = unit?.area || 0

  const effectiveBasePrice = quoteResult ? quoteResult.rawPriceGross : basePrice
  const effectiveFinalPrice = quoteResult ? quoteResult.finalPrice : finalPrice
  const effectiveFinalPriceGross = quoteResult ? quoteResult.finalPriceGross : finalPrice
  const effectiveTotalDiscount = quoteResult ? quoteResult.totalDiscount : totalDiscount
  const effectiveLoanAmount = quoteResult ? quoteResult.loanAmount : (loanAmount || 0)
  const effectiveEquityAmount = quoteResult ? quoteResult.equityAmount : (equityAmount || 0)
  const effectiveMonthlyPayment = quoteResult ? quoteResult.estimatedMonthlyPayment : (monthlyPayment || 0)

  // Financial calculations: Base price includes VAT (10%) and KPBT (2%) => Total factor 1.12
  const netPrice = quoteResult ? quoteResult.rawPriceNet : (basePrice > 0 ? Math.round(basePrice / 1.12) : 0)
  const vatAmount = quoteResult ? quoteResult.rawPriceVAT : (basePrice > 0 ? Math.round(netPrice * 0.10) : 0)
  const maintenanceFee = quoteResult ? quoteResult.kpbt : (basePrice > 0 ? Math.round(netPrice * 0.02) : 0)

  // Use quoteResult paymentSchedule if available, otherwise fallback to legacy schedules
  const scheduleSource =
    quoteResult?.paymentSchedule && quoteResult.paymentSchedule.length > 0
      ? quoteResult.paymentSchedule.map((m: any) => ({
          name: m.name,
          percentage: m.percentage,
          amount: m.amount,
          dueDateNote: m.deadlineNote,
          cumulativeAmount: m.cumulativeAmount,
          isDeposit: m.period === 1 || m.name?.toLowerCase().includes('cọc'),
          cumulativePercentage: m.cumulativePercentage,
        }))
      : schedules

  // Calculate cumulative schedules
  let runPercent = 0
  let runAmount = 0
  const enrichedSchedules = scheduleSource.map((s: any, idx: number) => {
    const pct = Number(s.percentage || s.percentValue || 0)
    const amt = Number(s.amount || 0)
    runPercent += pct
    runAmount += amt
    const isDep = Boolean(s.isDeposit || (idx === 0 && (pct === 0 || s.name?.toLowerCase().includes('cọc'))))
    const cumAmt = s.cumulativeAmount != null ? s.cumulativeAmount : runAmount
    const cumPct = s.cumulativePercentage != null
      ? s.cumulativePercentage
      : (effectiveFinalPriceGross > 0 ? Math.round((cumAmt / effectiveFinalPriceGross) * 100) : runPercent)

    return {
      ...s,
      percentage: pct,
      amount: amt,
      isDeposit: isDep,
      cumPercent: isDep && pct === 0 ? '-' : `${cumPct}%`,
      cumAmount: cumAmt,
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
              <td colSpan={3} className="p-2.5 font-bold text-slate-900 text-sm text-blue-700">{formatArea(area)}</td>
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
          {quoteResult ? (
            /* ── BÓC TÁCH CHI TIẾT TỪ BỘ MÁY TÍNH GIÁ ĐA CHÍNH SÁCH ── */
            <div className="space-y-2.5">
              {/* Active Policy Header */}
              <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-200 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="px-2 py-0.5 rounded bg-blue-100 font-mono">{quoteResult.policyCode}</span>
                  <span>{quoteResult.policyName}</span>
                </div>
                <div className="text-slate-500">
                  Áp dụng: Tòa {quoteResult.building} ({quoteResult.policyVersion})
                </div>
              </div>

              {/* A. Giá căn thô */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide text-blue-900 flex justify-between">
                  <span>A. Giá Trị Căn Hộ Thô:</span>
                  <span className="text-slate-900">{formatVND(quoteResult.rawPriceGross)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                  <span>• Giá căn thô (chưa VAT):</span>
                  <span>{formatVND(quoteResult.rawPriceNet)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                  <span>• Thuế VAT căn thô (10%):</span>
                  <span>+{formatVND(quoteResult.rawPriceVAT)}</span>
                </div>
              </div>

              {/* B. Giá hoàn thiện */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide text-blue-900 flex justify-between">
                  <span>B. Giá Trị Hoàn Thiện (Căn {quoteResult.unitType} - {quoteResult.netArea} m²):</span>
                  <span className="text-slate-900">{formatVND(quoteResult.completionGross)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                  <span>• Đơn giá hoàn thiện:</span>
                  <span className="font-semibold text-blue-800">
                    {formatVND(quoteResult.completionRate)} / m²
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                  <span>• Hoàn thiện (chưa VAT):</span>
                  <span>{formatVND(quoteResult.completionNet)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                  <span>• Thuế VAT hoàn thiện (10%):</span>
                  <span>+{formatVND(quoteResult.completionVAT)}</span>
                </div>
              </div>

              {/* C. KPBT */}
              <div className="flex justify-between items-center px-2.5 py-1.5 bg-slate-100 rounded-lg text-slate-700 text-[11px]">
                <div>
                  <strong>C. Kinh phí bảo trì (KPBT 2%):</strong>
                  <span className="text-slate-500 block text-[10px]">Thu khi bàn giao căn hộ, không trừ vào HĐMB</span>
                </div>
                <span className="font-semibold text-slate-900">{formatVND(quoteResult.kpbt)}</span>
              </div>

              {/* D. Tổng trước ưu đãi */}
              <div className="flex justify-between items-center py-1 border-t border-slate-200 text-sm font-bold text-slate-800">
                <span>TỔNG GIÁ TRỊ GỒM VAT TRƯỚC CHIẾT KHẤU (A + B):</span>
                <span className="text-slate-900 text-base">{formatVND(quoteResult.subtotalGross)}</span>
              </div>

              {/* E. Chiết khấu */}
              <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-slate-700">
                <div className="font-bold text-emerald-900 text-[11px] uppercase tracking-wide flex justify-between">
                  <span>D. Chiết Khấu & Ưu Đãi (Cơ sở: Giá thô chưa VAT):</span>
                  <span className="text-emerald-700 font-black">-{formatVND(quoteResult.totalDiscount)}</span>
                </div>
                {quoteResult.noLoanDiscount > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                    <span>• Chiết khấu không vay ngân hàng (5% giá thô chưa VAT):</span>
                    <span className="font-bold text-emerald-700">-{formatVND(quoteResult.noLoanDiscount)}</span>
                  </div>
                )}
                {quoteResult.earlyPaymentDiscount > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                    <span>• Chiết khấu thanh toán sớm:</span>
                    <span className="font-bold text-emerald-700">-{formatVND(quoteResult.earlyPaymentDiscount)}</span>
                  </div>
                )}
                {quoteResult.otherDiscounts > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                    <span>• Ưu đãi khác:</span>
                    <span className="font-bold text-emerald-700">-{formatVND(quoteResult.otherDiscounts)}</span>
                  </div>
                )}
                {quoteResult.earlyPaymentInterest > 0 && (
                  <div className="flex justify-between text-[11px] text-purple-700 font-bold pl-2 pt-1 border-t border-emerald-200">
                    <span>★ Lãi suất thanh toán sớm (8%/năm cho {quoteResult.earlyDays} ngày):</span>
                    <span>+{formatVND(quoteResult.earlyPaymentInterest)}</span>
                  </div>
                )}
              </div>

              {/* Early key notification banner if eligible */}
              {quoteResult.earlyKeyEligible && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  quoteResult.earlyKeyQualified
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}>
                  <span>★ Quyền lợi Sun Early Key (Nhận bàn giao sớm):</span>
                  <span className="px-2 py-0.5 rounded font-black text-[11px]">
                    {quoteResult.earlyKeyQualified ? 'ĐỦ ĐIỀU KIỆN (Thanh toán >= 70%)' : 'CHƯA ĐẠT (Cần TT >= 70%)'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Fallback legacy price display */
            <>
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
                  <div className="flex flex-wrap justify-between items-center gap-1 pb-1 border-b border-blue-200/50">
                    <span className="font-bold text-blue-950 uppercase tracking-wide text-[10px] flex items-center gap-1">
                      <span>🏷️</span> Chính sách bán hàng áp dụng ({(policies && policies.length > 0 ? policies : [policy]).length} chính sách):
                    </span>
                    <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded text-blue-800 font-bold">
                      Quy tắc: {discountMode === 'SEQUENTIAL' ? 'Lũy kế từng phần' : 'Cộng dồn chiết khấu'}
                    </span>
                  </div>
                  <div className="space-y-1 pt-0.5">
                    {(policies && policies.length > 0 ? policies : [policy]).map((p: any, idx: number) => (
                      <div key={p.id || idx} className="flex items-start justify-between gap-2 pl-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">•</span>
                          <div>
                            <strong className="text-slate-900 font-bold">{p.name}</strong>
                            {p.description && <span className="text-slate-600"> — {p.description}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-emerald-700 font-bold">
                  <span>TỔNG GIÁ TRỊ CHIẾT KHẤU & QUÀ TẶNG CĐT:</span>
                  <span className="text-sm">-{formatVND(totalDiscount)}</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center pt-3 pb-1 border-t-2 border-slate-900 text-slate-900 font-black text-sm">
            <span className="uppercase text-slate-900 tracking-wide">
              GIÁ BÁN THỰC TẾ HỢP ĐỒNG (SAU CHIẾT KHẤU - GIÁ HĐMB):
            </span>
            <span className="text-blue-700 text-xl font-black">{formatVND(effectiveFinalPrice)}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-700 font-bold bg-slate-100 px-2.5 py-1.5 rounded-lg mt-1">
            <span>TỔNG GIÁ TRỊ KHÁCH HÀNG THANH TOÁN (GỒM VAT & KPBT):</span>
            <span className="text-slate-900 text-sm font-black">{formatVND(effectiveFinalPriceGross)}</span>
          </div>

          {area > 0 && (
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
              <span>Đơn giá thông thủy niêm yết: <strong>{formatPricePerM2(effectiveBasePrice / area)}</strong></span>
              <span>Đơn giá thông thủy thực tế: <strong className="text-emerald-700 font-bold">{formatPricePerM2(effectiveFinalPrice / area)}</strong></span>
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
                    {s.isDeposit || s.percentage === 0 ? 'Cọc' : `${s.percentage}%`}
                  </td>
                  <td className="border p-2 text-center text-slate-500 font-medium">
                    {s.cumPercent}
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
                  TỔNG CỘNG (GỒM VAT & KPBT):
                </td>
                <td className="border p-2 text-center text-blue-700 font-bold">100%</td>
                <td className="border p-2 text-center text-blue-700 font-bold">100%</td>
                <td className="border p-2 text-right text-blue-700 text-sm">{formatVND(effectiveFinalPriceGross)}</td>
                <td className="border p-2 text-right text-blue-700 text-sm">{formatVND(effectiveFinalPriceGross)}</td>
                <td className="border p-2 text-emerald-700 font-bold text-[11px]">Hoàn tất thanh toán</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── 6. BANK LOAN ESTIMATION ── */}
      {paymentPlan?.type === 'LOAN' && effectiveLoanAmount > 0 && (
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
              <strong className="text-slate-900 text-sm">{formatVND(effectiveEquityAmount)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Hạn mức vay (70%):</span>
              <strong className="text-blue-700 text-sm font-black">{formatVND(effectiveLoanAmount)}</strong>
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
                <strong className="text-blue-800 text-sm font-black">{formatVND(effectiveMonthlyPayment)}</strong>
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
                <div>• 1BR / 1PN+: <strong>100 triệu đồng</strong></div>
                <div>• 2BR: <strong>150 triệu đồng</strong></div>
                <div>• 3BR: <strong>200 triệu đồng</strong></div>
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
