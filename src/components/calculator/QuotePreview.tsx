import React, { forwardRef } from 'react'
import { Unit, Policy, PaymentSchedule, PaymentPlan } from '@prisma/client'
import { formatVND, formatArea, formatPricePerM2 } from '@/lib/calculations'

type QuotePreviewProps = {
  unit: Unit
  policy: Policy | null
  paymentPlan: PaymentPlan | null
  schedules: any[]
  basePrice: number
  finalPrice: number
  totalDiscount: number
  loanAmount?: number
  equityAmount?: number
  interestRate?: number
  loanTerm?: number
  monthlyPayment?: number
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>((props, ref) => {
  const { unit, policy, paymentPlan, schedules, basePrice, finalPrice, totalDiscount } = props
  const date = new Date().toLocaleDateString('vi-VN')

  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-4xl mx-auto rounded-lg shadow-sm" style={{ width: '800px', minHeight: '1131px', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SUN URBAN CITY</h1>
          <p className="text-slate-500 uppercase tracking-widest text-sm mt-1">Sales Price Quotation</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Ngày lập: {date}</p>
          <p className="text-sm font-semibold mt-1">Dự án: Sun Urban City Hà Nam</p>
        </div>
      </div>

      {/* UNIT INFO */}
      <div className="mb-8">
        <h2 className="text-lg font-bold uppercase mb-4 text-slate-800">1. Thông tin căn hộ</h2>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="flex"><span className="w-24 text-slate-500">Mã căn:</span><span className="font-semibold">{unit.unitCode}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Tòa:</span><span className="font-semibold">{unit.building}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Tầng:</span><span className="font-semibold">{unit.floor}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Loại căn:</span><span className="font-semibold">{unit.unitType}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Diện tích:</span><span className="font-semibold">{formatArea(unit.area)}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Hướng:</span><span className="font-semibold">{unit.direction}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">View:</span><span className="font-semibold">{unit.view}</span></div>
          <div className="flex"><span className="w-24 text-slate-500">Đơn giá:</span><span className="font-semibold">{formatPricePerM2(finalPrice / unit.area)}</span></div>
        </div>
      </div>

      {/* PRICE INFO */}
      <div className="mb-8">
        <h2 className="text-lg font-bold uppercase mb-4 text-slate-800">2. Giá bán & Ưu đãi</h2>
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Giá niêm yết (Đã bao gồm VAT & KPBT)</span>
            <span className="font-semibold">{formatVND(basePrice)}</span>
          </div>
          {policy && totalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-green-700">
              <span>Chiết khấu ({policy.name})</span>
              <span>- {formatVND(totalDiscount)}</span>
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
        <div className="mb-8">
          <h2 className="text-lg font-bold uppercase mb-4 text-slate-800">3. Tiến độ thanh toán</h2>
          <p className="text-sm font-semibold mb-2">Phương án: {paymentPlan.name}</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left w-1/4">Đợt</th>
                <th className="border p-2 text-right w-1/6">Tỷ lệ</th>
                <th className="border p-2 text-right w-1/4">Số tiền</th>
                <th className="border p-2 text-left">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, idx) => (
                <tr key={idx}>
                  <td className="border p-2 font-medium">{s.stepName}</td>
                  <td className="border p-2 text-right">{s.percentValue}%</td>
                  <td className="border p-2 text-right font-semibold">{formatVND(s.amount)}</td>
                  <td className="border p-2 text-xs text-slate-600">{s.timePoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOAN INFO */}
      {paymentPlan?.type === 'LOAN' && props.loanAmount && (
        <div className="mb-8">
          <h2 className="text-lg font-bold uppercase mb-4 text-slate-800">4. Chi tiết vay ngân hàng</h2>
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-slate-600">Vốn tự có:</span>
              <span className="font-semibold">{formatVND(props.equityAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Số tiền vay:</span>
              <span className="font-semibold">{formatVND(props.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Lãi suất:</span>
              <span className="font-semibold">{props.interestRate}%/năm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Thời hạn vay:</span>
              <span className="font-semibold">{props.loanTerm} tháng</span>
            </div>
            <div className="col-span-2 flex justify-between border-t border-slate-200 pt-3 mt-1">
              <span className="text-slate-600 font-bold">Thanh toán gốc + lãi dự kiến/tháng:</span>
              <span className="font-bold text-blue-700 text-lg">{formatVND(props.monthlyPayment || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p className="mb-2 italic">"Thông tin trên bảng tính này mang tính tham khảo và có thể thay đổi theo chính sách bán hàng chính thức tại từng thời điểm của Chủ đầu tư."</p>
        <p>Báo giá được tạo tự động từ hệ thống Sales Price Calculator - Sun Urban City</p>
      </div>
    </div>
  )
})

QuotePreview.displayName = 'QuotePreview'
