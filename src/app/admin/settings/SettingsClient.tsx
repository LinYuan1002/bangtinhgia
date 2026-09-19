'use client'

import React, { useState, useTransition } from 'react'
import { upsertSetting } from '@/app/admin/actions'

interface Props {
  initialSettings: Record<string, string>
}

export default function SettingsClient({ initialSettings }: Props) {
  const [discountMode, setDiscountMode] = useState(
    initialSettings['discount_calculation_mode'] || 'STACKED'
  )
  const [vatRate, setVatRate] = useState(initialSettings['vat_rate'] || '0.1')
  const [maintenanceFeeRate, setMaintenanceFeeRate] = useState(
    initialSettings['maintenance_fee_rate'] || '0.02'
  )
  const [projectName, setProjectName] = useState(
    initialSettings['project_name'] || 'Sun Urban City Hà Nam'
  )
  const [isPending, startTransition] = useTransition()
  const [savedMsg, setSavedMsg] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await Promise.all([
        upsertSetting('discount_calculation_mode', discountMode, 'Phương thức tính chiết khấu'),
        upsertSetting('vat_rate', vatRate, 'Thuế suất VAT'),
        upsertSetting('maintenance_fee_rate', maintenanceFeeRate, 'Phí bảo trì'),
        upsertSetting('project_name', projectName, 'Tên dự án mặc định'),
      ])
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    })
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Cài đặt Hệ Thống</h1>
        <p className="text-sm text-slate-500">
          Cấu hình quy tắc tính toán chiết khấu toàn hệ thống, tham số tài chính và dự án
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl animate-in fade-in">
          ✓ Đã lưu cài đặt thành công!
        </div>
      )}

      <div className="space-y-6">
        {/* Discount Calculation Mode */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Quy Tắc Tính Thứ Tự Chiết Khấu (Discount Calculation Mode)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Xác định cách các chính sách chiết khấu (CK theo tỷ lệ, CK thanh toán sớm, quà tặng...) được trừ vào giá bán.
          </p>

          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                discountMode === 'STACKED'
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="discountMode"
                value="STACKED"
                checked={discountMode === 'STACKED'}
                onChange={() => setDiscountMode('STACKED')}
                className="mt-1"
              />
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Cộng Dồn — STACKED (Mặc định phổ biến)
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Tất cả các khoản chiết khấu % đều được nhân với <strong>Giá niêm yết ban đầu</strong>.
                  <div className="font-mono bg-white p-2 rounded border border-slate-200 mt-1.5 text-slate-700">
                    Giá cuối = Giá gốc - (Giá gốc × % CK A) - (Giá gốc × % CK B) - Fixed Discounts
                  </div>
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                discountMode === 'SEQUENTIAL'
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="discountMode"
                value="SEQUENTIAL"
                checked={discountMode === 'SEQUENTIAL'}
                onChange={() => setDiscountMode('SEQUENTIAL')}
                className="mt-1"
              />
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Lũy Kế — SEQUENTIAL (Trừ dần từng bước)
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Mỗi khoản chiết khấu tiếp theo sẽ được áp dụng trên <strong>Giá còn lại</strong> sau khi đã trừ khoản chiết khấu trước.
                  <div className="font-mono bg-white p-2 rounded border border-slate-200 mt-1.5 text-slate-700">
                    Giá gốc → Trừ CK A → Giá còn lại 1 → Trừ CK B trên Giá 1 → Giá cuối
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Project & General Params */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Thông số Dự án & Thuế</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên Dự Án
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thuế GTGT / VAT (tỷ lệ 0.1 = 10%)
              </label>
              <input
                type="text"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kinh phí bảo trì KPBT (tỷ lệ 0.02 = 2%)
            </label>
            <input
              type="text"
              value={maintenanceFeeRate}
              onChange={(e) => setMaintenanceFeeRate(e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow transition disabled:opacity-50"
          >
            {isPending ? 'Đang lưu cài đặt...' : 'Lưu tất cả cài đặt'}
          </button>
        </div>
      </div>
    </div>
  )
}
