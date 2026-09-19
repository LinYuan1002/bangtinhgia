import React, { forwardRef } from 'react'
import { formatVND, formatArea, formatPricePerM2 } from '@/lib/calculations'

type QuotePreviewProps = {
  unit: any
  policy: any | null
  paymentPlan: any | null
  schedules: any[]
  basePrice: number
  finalPrice: number
  totalDiscount: number
  loanAmount?: number
  equityAmount?: number
  interestRate?: number
  loanTerm?: number
  monthlyPayment?: number
  customerName?: string
  salesName?: string
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>((props, ref) => {
  const {
    unit,
    policy,
    paymentPlan,
    schedules,
    basePrice,
    finalPrice,
    totalDiscount,
    customerName,
    salesName,
  } = props
  const date = new Date().toLocaleDateString('vi-VN')

  const building = unit.buildingCode || unit.building || '—'
  const floor = unit.floorNumber || unit.floor || '—'
  const unitType = unit.unitTypeName || unit.unitType || '—'

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 max-w-4xl mx-auto rounded-xl shadow-sm"
      style={{ width: '800px', minHeight: '1131px', boxSizing: 'border-box' }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SUN URBAN CITY</h1>
          <p className="text-slate-500 uppercase tracking-widest text-xs mt-1">
            BẢNG DỰ TOÁN BÁO GIÁ BÁN HÀNG
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Ngày lập: {date}</p>
          <p className="text-sm font-semibold text-blue-700 mt-0.5">Dự án: Sun Urban City Hà Nam</p>
        </div>
      </div>

      {/* CUSTOMER & SALES INFO */}
      {(customerName || salesName) && (
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg mb-6 text-sm">
          <div>
            <span className="text-slate-500 text-xs block">Khách hàng:</span>
            <span className="font-bold text-slate-900">{customerName || 'Quý khách hàng'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block">Chuyên viên tư vấn:</span>
            <span className="font-bold text-slate-900">{salesName || 'Tư vấn viên Sun Group'}</span>
          </div>
        </div>
      )}

      {/* UNIT INFO */}
      <div className="mb-6">
        <h2 className="text-base font-bold uppercase mb-3 text-slate-800">1. Thông tin căn hộ</h2>
        <div className="grid grid-cols-2 gap-y-2.5 text-sm">
          <div className="flex">
            <span className="w-28 text-slate-500">Mã căn:</span>
            <span className="font-bold text-blue-600 font-mono">{unit.unitCode}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Tòa:</span>
            <span className="font-semibold">{building}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Tầng:</span>
            <span className="font-semibold">{floor}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Loại căn:</span>
            <span className="font-semibold">{unitType}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Diện tích:</span>
            <span className="font-semibold">{formatArea(unit.area)}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Hướng:</span>
            <span className="font-semibold">{unit.direction || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">View:</span>
            <span className="font-semibold">{unit.view || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Đơn giá / m²:</span>
            <span className="font-semibold text-slate-800">
              {formatPricePerM2(unit.area > 0 ? finalPrice / unit.area : 0)}
            </span>
          </div>
        </div>
      </div>

      {/* PRICE INFO */}
      <div className="mb-6">
        <h2 className="text-base font-bold uppercase mb-3 text-slate-800">2. Giá bán & Ưu đãi</h2>
        <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Giá niêm yết (Đã bao gồm VAT & KPBT)</span>
            <span className="font-semibold">{formatVND(basePrice)}</span>
          </div>
          {policy && totalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-emerald-700">
              <span>Chiết khấu ({policy.name})</span>
              <span className="font-semibold">- {formatVND(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-base font-bold border-t border-slate-200 pt-3">
            <span>GIÁ BÁN THỰC TẾ (Sau ưu đãi)</span>
            <span className="text-blue-700 text-xl">{formatVND(finalPrice)}</span>
          </div>
        </div>
      </div>

      {/* PAYMENT PLAN */}
      {paymentPlan && schedules.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold uppercase mb-3 text-slate-800">3. Tiến độ thanh toán</h2>
          <p className="text-xs font-semibold text-slate-600 mb-2">Phương án: {paymentPlan.name}</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border p-2 text-left">Đợt</th>
                <th className="border p-2 text-right">Tỷ lệ</th>
                <th className="border p-2 text-right">Số tiền (VNĐ)</th>
                <th className="border p-2 text-left">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, idx) => (
                <tr key={idx}>
                  <td className="border p-2 font-medium">{s.name || s.stepName}</td>
                  <td className="border p-2 text-right">{s.percentage || s.percentValue}%</td>
                  <td className="border p-2 text-right font-bold">{formatVND(s.amount)}</td>
                  <td className="border p-2 text-slate-600">
                    {s.dueDateNote || s.timePoint || 'Theo thông báo'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOAN INFO */}
      {paymentPlan?.type === 'LOAN' && props.loanAmount && (
        <div className="mb-6">
          <h2 className="text-base font-bold uppercase mb-3 text-slate-800">4. Chi tiết vay ngân hàng</h2>
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-slate-600">Vốn tự có (30%):</span>
              <span className="font-semibold">{formatVND(props.equityAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Số tiền vay (70%):</span>
              <span className="font-semibold">{formatVND(props.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Lãi suất tham chiếu:</span>
              <span className="font-semibold">{props.interestRate}%/năm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Thời hạn vay:</span>
              <span className="font-semibold">{props.loanTerm} tháng</span>
            </div>
            <div className="col-span-2 flex justify-between border-t border-slate-200 pt-2.5 mt-1 text-sm">
              <span className="font-bold text-slate-800">Ước tính trả hàng tháng:</span>
              <span className="font-bold text-blue-700">{formatVND(props.monthlyPayment || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
        <p className="italic mb-1">
          * Thông tin trên bảng tính này mang tính tham khảo và được lưu snapshot tại thời điểm lập phiếu.
        </p>
        <p>Báo giá được tạo tự động từ hệ thống Sales Price Calculator - Sun Urban City</p>
      </div>
    </div>
  )
})

QuotePreview.displayName = 'QuotePreview'
