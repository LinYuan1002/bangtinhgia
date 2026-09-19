'use client'

import React, { useState } from 'react'

export default function DatabaseSyncButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/setup-db', { method: 'GET' })
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setResult({ status: 'error', message: err.message || 'Lỗi mạng' })
    } finally {
      setLoading(false)
    }
  }

  const handleSeedP12 = async () => {
    if (!confirm('Nạp toàn bộ 15 căn hộ Quỹ Độc Quyền Tòa P12 và CSBH T9/2026 vào CSDL Turso Cloud?')) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/setup-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed-p12' }),
      })
      const data = await res.json()
      if (data.success) {
        alert('✓ Đã nạp thành công 15 căn hộ Quỹ Độc Quyền Tòa P12 và CSBH T9/2026 lên Database!')
        window.location.reload()
      } else {
        alert('Lỗi: ' + (data.message || data.error))
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 mb-8 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold">Cơ sở Dữ liệu Turso libSQL Cloud</h2>
          </div>
          <p className="text-xs text-blue-200 max-w-xl leading-relaxed">
            Kết nối trực tiếp tới cơ sở dữ liệu phân tán trên đám mây. Đảm bảo mọi thay đổi bảng giá, thêm mới hoặc xóa căn hộ đều được lưu trữ vĩnh viễn và đồng bộ theo thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedP12}
            disabled={loading}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            📥 Nạp 15 Căn P12 Thật
          </button>
          <button
            onClick={handleSync}
            disabled={loading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? '⚡ Đang kiểm tra & đồng bộ...' : '⚡ Khởi tạo / Đồng bộ Turso CSDL'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 pt-3 border-t border-blue-800/80 text-xs">
          {result.status === 'ok' ? (
            <div className="flex flex-wrap items-center gap-4 text-emerald-300">
              <span>✓ {result.schemaResult?.message || 'Kết nối CSDL ổn định.'}</span>
              <span className="text-white">
                Số lượng: <strong>{result.dataCounts?.units || 0}</strong> căn •{' '}
                <strong>{result.dataCounts?.policies || 0}</strong> chính sách •{' '}
                <strong>{result.dataCounts?.paymentPlans || 0}</strong> tiến độ
              </span>
            </div>
          ) : (
            <div className="text-rose-300">
              ⚠ Lỗi: {result.message || 'Không thể kết nối tới cơ sở dữ liệu'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
