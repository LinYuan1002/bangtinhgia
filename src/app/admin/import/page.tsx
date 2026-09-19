'use client'

import React, { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { processImport } from './actions'

// ── Field definitions for mapping ──
const SYSTEM_FIELDS = [
  { key: 'unitCode', label: 'Mã căn', required: true },
  { key: 'buildingCode', label: 'Tòa / Phân khu', required: true },
  { key: 'floorNumber', label: 'Tầng', required: true },
  { key: 'unitTypeName', label: 'Loại căn', required: false },
  { key: 'area', label: 'Diện tích (m²)', required: true },
  { key: 'direction', label: 'Hướng', required: false },
  { key: 'view', label: 'View', required: false },
  { key: 'basePrice', label: 'Giá bán (VNĐ)', required: true },
  { key: 'status', label: 'Trạng thái', required: false },
  { key: 'imageUrl', label: 'Link hình ảnh', required: false },
  { key: 'notes', label: 'Ghi chú', required: false },
]

type Step = 'upload' | 'detect' | 'mapping' | 'validate' | 'preview' | 'result'
type DuplicateAction = 'SKIP' | 'UPDATE' | 'CREATE_NEW'

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<any[]>([])   // raw rows from file
  const [columnMap, setColumnMap] = useState<Record<string, string>>({}) // systemField → fileColumn
  const [validationResults, setValidationResults] = useState<any[]>([])
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('SKIP')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // ─── Step 1: Upload ───────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      if (jsonData.length < 2) {
        alert('File không có dữ liệu')
        return
      }

      const headers = jsonData[0].map((h: any) => String(h ?? '').trim())
      const rows = jsonData.slice(1).filter((r) => r.some((c) => c !== null && c !== ''))

      setRawHeaders(headers)
      setRawRows(rows)

      // Auto-map based on common Vietnamese column names
      const autoMap: Record<string, string> = {}
      const matchers: Record<string, string[]> = {
        unitCode: ['mã căn', 'ma can', 'unitcode', 'unit code', 'mã'],
        buildingCode: ['tòa', 'toa', 'building', 'phân khu', 'phan khu'],
        floorNumber: ['tầng', 'tang', 'floor'],
        unitTypeName: ['loại căn', 'loai can', 'loại', 'unittype', 'type'],
        area: ['diện tích', 'dien tich', 'area', 'm2', 'dtsd'],
        direction: ['hướng', 'huong', 'direction'],
        view: ['view', 'cảnh quan', 'canh quan'],
        basePrice: ['giá bán', 'gia ban', 'giá', 'price', 'baseprice', 'base price'],
        status: ['trạng thái', 'trang thai', 'status'],
        imageUrl: ['hình ảnh', 'hinh anh', 'image', 'imageurl', 'link ảnh'],
        notes: ['ghi chú', 'ghi chu', 'notes', 'note'],
      }

      for (const [sysField, keywords] of Object.entries(matchers)) {
        const match = headers.find((h) =>
          keywords.some((kw) => h.toLowerCase().includes(kw.toLowerCase()))
        )
        if (match) autoMap[sysField] = match
      }

      setColumnMap(autoMap)
      setStep('detect')
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // ─── Step 3: Build mapped rows ──────────
  const getMappedRows = useCallback(() => {
    return rawRows.map((row) => {
      const mapped: any = {}
      for (const [sysField, fileCol] of Object.entries(columnMap)) {
        if (!fileCol) continue
        const colIdx = rawHeaders.indexOf(fileCol)
        if (colIdx >= 0) {
          let val = row[colIdx]
          // Clean price values
          if (sysField === 'basePrice' && val) {
            val = String(val).replace(/[,.\s]/g, '')
          }
          mapped[sysField] = val !== undefined && val !== null ? String(val).trim() : ''
        }
      }
      return mapped
    })
  }, [rawRows, rawHeaders, columnMap])

  // ─── Step 4: Validate ────────────────────
  const runValidation = useCallback(() => {
    const mapped = getMappedRows()
    const results = mapped.map((row, i) => {
      const issues: any[] = []
      const required = ['unitCode', 'buildingCode', 'floorNumber', 'area', 'basePrice']
      for (const f of required) {
        if (!row[f]) issues.push({ field: f, message: `${f} là bắt buộc`, severity: 'error' })
      }
      for (const f of ['area', 'basePrice', 'floorNumber']) {
        if (row[f] && isNaN(Number(row[f]))) {
          issues.push({ field: f, message: `${f} phải là số (nhận được: "${row[f]}")`, severity: 'error' })
        }
      }
      const validStatuses = ['AVAILABLE', 'HOLD', 'SOLD', 'LOCKED', 'UNAVAILABLE']
      if (row.status && !validStatuses.includes(row.status.toUpperCase())) {
        issues.push({ field: 'status', message: `Trạng thái không hợp lệ: "${row.status}"`, severity: 'error' })
      }
      return { row: i + 2, unitCode: row.unitCode || '?', issues, data: row }
    })
    setValidationResults(results)
    setStep('preview')
  }, [getMappedRows])

  // ─── Step 6: Import ──────────────────────
  const runImport = useCallback(async () => {
    setImporting(true)
    try {
      const mapped = getMappedRows()
      const result = await processImport({
        fileName,
        rows: mapped,
        duplicateAction,
      })
      setImportResult(result)
      setStep('result')
    } catch (e: any) {
      alert('Lỗi khi import: ' + e.message)
    } finally {
      setImporting(false)
    }
  }, [getMappedRows, fileName, duplicateAction])

  const errorCount = validationResults.filter((r) => r.issues.some((i: any) => i.severity === 'error')).length
  const warningCount = validationResults.filter((r) => r.issues.some((i: any) => i.severity === 'warning')).length

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: '1. Upload' },
    { key: 'detect', label: '2. Phát hiện' },
    { key: 'mapping', label: '3. Mapping' },
    { key: 'validate', label: '4. Kiểm tra' },
    { key: 'preview', label: '5. Xem trước' },
    { key: 'result', label: '6. Kết quả' },
  ]

  const stepOrder: Step[] = ['upload', 'detect', 'mapping', 'validate', 'preview', 'result']
  const currentIdx = stepOrder.indexOf(step)

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-slate-800 mb-6">📥 Import Căn hộ (Excel / CSV)</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
                s.key === step
                  ? 'bg-blue-600 text-white'
                  : stepOrder.indexOf(s.key) < currentIdx
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {stepOrder.indexOf(s.key) < currentIdx ? '✓' : i + 1}. {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-4 h-px bg-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">📂</div>
            <h2 className="font-semibold text-slate-700 mb-2">Chọn file để upload</h2>
            <p className="text-sm text-slate-400 mb-6">Hỗ trợ .xlsx, .xls, .csv — Tối đa 5MB</p>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              <span>Chọn file</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
            <p className="font-medium mb-2">📋 Định dạng cột khuyến nghị:</p>
            <code className="text-xs bg-white p-2 rounded border border-slate-200 block">
              Mã căn, Tòa, Tầng, Loại căn, Diện tích, Hướng, View, Giá bán, Trạng thái
            </code>
          </div>
        </div>
      )}

      {/* ── STEP 2: Detect ── */}
      {step === 'detect' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold mb-4">📋 File: <span className="text-blue-600">{fileName}</span></h2>
          <p className="text-sm text-slate-500 mb-4">
            Phát hiện <strong>{rawHeaders.length}</strong> cột, <strong>{rawRows.length}</strong> dòng dữ liệu
          </p>

          <div className="overflow-auto border border-slate-200 rounded-lg mb-6">
            <table className="text-xs w-full">
              <thead className="bg-slate-50">
                <tr>
                  {rawHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 border-r border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {rawHeaders.map((_, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-slate-600 border-r border-slate-200 max-w-[120px] truncate">
                        {String(row[ci] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="px-4 py-2 border border-slate-300 rounded text-sm">← Quay lại</button>
            <button onClick={() => setStep('mapping')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium">Tiếp theo →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Mapping ── */}
      {step === 'mapping' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold mb-4">🔗 Map cột file → trường hệ thống</h2>
          <p className="text-sm text-slate-400 mb-4">
            Hệ thống đã tự động ghép cột. Bạn có thể điều chỉnh nếu cần.
          </p>

          <div className="space-y-3 mb-6">
            {SYSTEM_FIELDS.map((sf) => (
              <div key={sf.key} className="flex items-center gap-4">
                <div className="w-40 text-sm text-slate-700 shrink-0">
                  {sf.label}
                  {sf.required && <span className="text-red-500 ml-1">*</span>}
                </div>
                <select
                  value={columnMap[sf.key] || ''}
                  onChange={(e) =>
                    setColumnMap((prev) => ({ ...prev, [sf.key]: e.target.value }))
                  }
                  className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">— Không map —</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <div className={`text-xs px-2 py-0.5 rounded ${columnMap[sf.key] ? 'bg-green-100 text-green-600' : sf.required ? 'bg-red-50 text-red-400' : 'bg-slate-100 text-slate-400'}`}>
                  {columnMap[sf.key] ? '✓' : sf.required ? 'Cần thiết' : 'Tùy chọn'}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('detect')} className="px-4 py-2 border border-slate-300 rounded text-sm">← Quay lại</button>
            <button onClick={runValidation} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium">Kiểm tra dữ liệu →</button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Preview ── */}
      {step === 'preview' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold mb-4">👁️ Xem trước kết quả</h2>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-slate-700">{validationResults.length}</div>
              <div className="text-xs text-slate-400">Tổng dòng</div>
            </div>
            <div className="bg-green-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-green-600">{validationResults.length - errorCount - warningCount}</div>
              <div className="text-xs text-green-500">Hợp lệ</div>
            </div>
            <div className="bg-yellow-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-xs text-yellow-500">Cảnh báo</div>
            </div>
            <div className="bg-red-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-red-500">Lỗi</div>
            </div>
          </div>

          {/* Duplicate handling */}
          <div className="border border-slate-200 rounded p-4 mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Xử lý mã căn trùng lặp:</p>
            <div className="flex gap-4">
              {(['SKIP', 'UPDATE', 'CREATE_NEW'] as DuplicateAction[]).map((action) => (
                <label key={action} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="dupAction"
                    value={action}
                    checked={duplicateAction === action}
                    onChange={() => setDuplicateAction(action)}
                  />
                  {action === 'SKIP' ? 'Bỏ qua' : action === 'UPDATE' ? 'Cập nhật' : 'Tạo mới'}
                </label>
              ))}
            </div>
          </div>

          {/* Error rows */}
          {validationResults.filter((r) => r.issues.length > 0).length > 0 && (
            <div className="overflow-auto border border-slate-200 rounded mb-4 max-h-48">
              <table className="text-xs w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Dòng</th>
                    <th className="px-3 py-2 text-left">Mã căn</th>
                    <th className="px-3 py-2 text-left">Trường</th>
                    <th className="px-3 py-2 text-left">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults
                    .filter((r) => r.issues.length > 0)
                    .slice(0, 50)
                    .flatMap((r) =>
                      r.issues.map((issue: any, i: number) => (
                        <tr key={`${r.row}-${i}`} className={`border-t ${issue.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                          <td className="px-3 py-1.5">{r.row}</td>
                          <td className="px-3 py-1.5 font-medium">{r.unitCode}</td>
                          <td className="px-3 py-1.5 text-slate-500">{issue.field}</td>
                          <td className="px-3 py-1.5 text-red-600">{issue.message}</td>
                        </tr>
                      ))
                    )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('mapping')} className="px-4 py-2 border border-slate-300 rounded text-sm">← Quay lại</button>
            {errorCount > 0 && (
              <div className="flex items-center gap-2 text-red-500 text-sm px-3 py-2 bg-red-50 rounded">
                ⚠️ Còn {errorCount} lỗi — không thể import
              </div>
            )}
            {errorCount === 0 && (
              <button
                onClick={runImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? '⏳ Đang import...' : `✅ Import ${validationResults.length} dòng`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 6: Result ── */}
      {step === 'result' && importResult && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold mb-4">
            {importResult.summary.status === 'COMPLETED' ? '✅' : importResult.summary.status === 'FAILED' ? '❌' : '⚠️'}{' '}
            Kết quả Import
          </h2>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-slate-700">{importResult.summary.total}</div>
              <div className="text-xs text-slate-400">Tổng</div>
            </div>
            <div className="bg-green-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-green-600">{importResult.summary.success}</div>
              <div className="text-xs text-green-500">Thành công</div>
            </div>
            <div className="bg-yellow-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{importResult.summary.warnings}</div>
              <div className="text-xs text-yellow-500">Cảnh báo</div>
            </div>
            <div className="bg-red-50 rounded p-3 text-center">
              <div className="text-xl font-bold text-red-600">{importResult.summary.errors}</div>
              <div className="text-xs text-red-500">Lỗi</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setFileName(''); setRawHeaders([]); setRawRows([]); setColumnMap({}); setValidationResults([]); setImportResult(null) }}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium"
            >
              Import file mới
            </button>
            <a href="/admin/units" className="px-4 py-2 border border-slate-300 rounded text-sm inline-flex items-center">
              Xem danh sách căn hộ →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
