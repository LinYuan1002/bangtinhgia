'use client'

import React, { useState, useMemo, useTransition, useEffect } from 'react'
import { saveUnit, deleteUnit, bulkUpdateUnitStatus, bulkUpdateUnitPrice } from '@/app/admin/actions'
import { formatVND } from '@/lib/calculations'
import {
  getStoredUnits,
  addOrUpdateStoredUnit,
  deleteStoredUnit,
  resetStoredUnitsToDefault,
  saveStoredUnits,
} from '@/lib/clientStore'

interface UnitItem {
  id: string
  unitCode: string
  buildingCode: string
  floorNumber: number
  unitTypeName: string
  area: number
  bedrooms?: number
  bathrooms?: number
  direction?: string
  view?: string
  basePrice: number
  pricePerM2?: number
  status: string
  imageUrl?: string | null
  notes?: string | null
  createdAt?: string | Date
}

interface Props {
  initialUnits: UnitItem[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: 'Còn hàng', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  HOLD: { label: 'Đang giữ', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  SOLD: { label: 'Đã bán', className: 'bg-rose-100 text-rose-800 border-rose-300' },
  LOCKED: { label: 'Khóa', className: 'bg-slate-200 text-slate-700 border-slate-300' },
  UNAVAILABLE: { label: 'Không bán', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
}

export default function UnitsClient({ initialUnits }: Props) {
  const [units, setUnits] = useState<UnitItem[]>(initialUnits)
  const [isPending, startTransition] = useTransition()

  // Hydrate from client storage on mount
  useEffect(() => {
    const stored = getStoredUnits(initialUnits)
    setUnits(stored)
    const handler = (e: any) => {
      if (e.detail) setUnits(e.detail)
    }
    window.addEventListener('sun_units_updated', handler)
    return () => window.removeEventListener('sun_units_updated', handler)
  }, [initialUnits])

  // Filter states
  const [search, setSearch] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')

  // Sort states
  const [sortField, setSortField] = useState<keyof UnitItem>('unitCode')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Selection for bulk action
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Partial<UnitItem> | null>(null)
  const [priceChangeReason, setPriceChangeReason] = useState('')

  // Bulk action states
  const [bulkStatus, setBulkStatus] = useState('AVAILABLE')
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkPriceReason, setBulkPriceReason] = useState('Điều chỉnh bảng giá chung')
  const [bulkActionType, setBulkActionType] = useState<'STATUS' | 'PRICE' | null>(null)

  // Unique options for filters
  const buildings = useMemo(() => {
    const list = Array.from(new Set(units.map((u) => u.buildingCode))).filter(Boolean)
    return list.sort()
  }, [units])

  const unitTypes = useMemo(() => {
    const list = Array.from(new Set(units.map((u) => u.unitTypeName))).filter(Boolean)
    return list.sort()
  }, [units])

  // Filtered & Sorted units
  const filteredUnits = useMemo(() => {
    return units
      .filter((u) => {
        const matchesSearch =
          !search ||
          u.unitCode.toLowerCase().includes(search.toLowerCase()) ||
          (u.view && u.view.toLowerCase().includes(search.toLowerCase())) ||
          (u.direction && u.direction.toLowerCase().includes(search.toLowerCase()))

        const matchesBuilding = selectedBuilding === 'ALL' || u.buildingCode === selectedBuilding
        const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus
        const matchesType = selectedType === 'ALL' || u.unitTypeName === selectedType

        return matchesSearch && matchesBuilding && matchesStatus && matchesType
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? ''
        const valB = b[sortField] ?? ''
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      })
  }, [units, search, selectedBuilding, selectedStatus, selectedType, sortField, sortOrder])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUnits.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredUnits.map((u) => u.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSort = (field: keyof UnitItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const openCreateModal = () => {
    setEditingUnit({
      unitCode: '',
      buildingCode: buildings[0] || 'S1',
      floorNumber: 1,
      unitTypeName: '1PN',
      area: 45,
      bedrooms: 1,
      bathrooms: 1,
      direction: 'Đông',
      view: 'Nội khu',
      basePrice: 2000000000,
      status: 'AVAILABLE',
      imageUrl: '',
      notes: '',
    })
    setPriceChangeReason('')
    setIsEditModalOpen(true)
  }

  const openEditModal = (unit: UnitItem) => {
    setEditingUnit({ ...unit })
    setPriceChangeReason('')
    setIsEditModalOpen(true)
  }

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUnit?.unitCode) {
      alert('Vui lòng nhập Mã căn')
      return
    }

    const basePrice = parseFloat(String(editingUnit.basePrice)) || 0
    const area = parseFloat(String(editingUnit.area)) || 0
    const pricePerM2 = area > 0 ? basePrice / area : 0

    const unitPayload = {
      ...editingUnit,
      id: editingUnit.id || 'unit-' + Date.now(),
      basePrice,
      area,
      pricePerM2,
      priceChangeReason: priceChangeReason || 'Cập nhật từ Admin',
    }

    // 1. Immediately persist to client storage
    const updated = addOrUpdateStoredUnit(unitPayload, units)
    setUnits(updated)
    setIsEditModalOpen(false)

    // 2. Persist to server action in background
    startTransition(async () => {
      try {
        await saveUnit(unitPayload)
      } catch (err) {
        console.warn('Background server save note:', err)
      }
    })
  }

  const handleDeleteUnit = (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa căn hộ ${code}? Hành động này không thể hoàn tác.`)) {
      return
    }
    // 1. Immediately delete from client storage
    const updated = deleteStoredUnit(id, units)
    setUnits(updated)
    setSelectedIds((prev) => prev.filter((i) => i !== id))

    // 2. Delete on server in background
    startTransition(async () => {
      try {
        await deleteUnit(id)
      } catch (err) {
        console.warn('Background server delete note:', err)
      }
    })
  }

  const handleExecuteBulkStatus = () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Xác nhận đổi trạng thái của ${selectedIds.length} căn đã chọn thành "${STATUS_BADGES[bulkStatus]?.label || bulkStatus}"?`)) {
      return
    }
    const updated = units.map((u) => (selectedIds.includes(u.id) ? { ...u, status: bulkStatus } : u))
    saveStoredUnits(updated)
    setUnits(updated)
    setBulkActionType(null)
    alert(`Đã cập nhật trạng thái thành công cho ${selectedIds.length} căn.`)

    startTransition(async () => {
      try {
        await bulkUpdateUnitStatus(selectedIds, bulkStatus)
      } catch (err) {
        console.warn('Background bulk status note:', err)
      }
    })
  }

  const handleExecuteBulkPrice = () => {
    const priceNum = parseFloat(bulkPrice.replace(/[,.\s]/g, ''))
    if (!priceNum || priceNum <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ')
      return
    }
    if (!confirm(`Xác nhận cập nhật giá của ${selectedIds.length} căn đã chọn thành ${formatVND(priceNum)}? Lịch sử giá sẽ được ghi nhận tự động.`)) {
      return
    }
    const updated = units.map((u) =>
      selectedIds.includes(u.id)
        ? { ...u, basePrice: priceNum, pricePerM2: u.area > 0 ? priceNum / u.area : 0 }
        : u
    )
    saveStoredUnits(updated)
    setUnits(updated)
    setBulkActionType(null)
    setBulkPrice('')
    alert(`Đã cập nhật giá thành công cho ${selectedIds.length} căn.`)

    startTransition(async () => {
      try {
        await bulkUpdateUnitPrice(selectedIds, priceNum, bulkPriceReason)
      } catch (err) {
        console.warn('Background bulk price note:', err)
      }
    })
  }

  const handleResetToDefault = () => {
    if (confirm('Khôi phục danh sách căn hộ về dữ liệu mẫu gốc ban đầu? Các căn bạn đã thêm hoặc sửa sẽ được làm mới.')) {
      const resetList = resetStoredUnitsToDefault(initialUnits)
      setUnits(resetList)
      setSelectedIds([])
      alert('Đã khôi phục dữ liệu gốc thành công.')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý Căn hộ</h1>
          <p className="text-sm text-slate-500">
            Tổng cộng {units.length} căn hộ trong hệ thống ({filteredUnits.length} hiển thị)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToDefault}
            title="Khôi phục dữ liệu mẫu ban đầu nếu cần"
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            ↺ Khôi phục gốc
          </button>
          <a
            href="/admin/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            📥 Import Excel/CSV
          </a>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            + Thêm căn hộ mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Mã căn, view, hướng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tòa / Phân khu</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả các tòa</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  Tòa {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="AVAILABLE">Còn hàng</option>
              <option value="HOLD">Đang giữ</option>
              <option value="SOLD">Đã bán</option>
              <option value="LOCKED">Khóa</option>
              <option value="UNAVAILABLE">Không bán</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Loại căn</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả loại căn</option>
              {unitTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <span>✓ Đã chọn <strong>{selectedIds.length}</strong> căn hộ</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-blue-600 underline hover:text-blue-800 ml-2"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setBulkActionType(bulkActionType === 'STATUS' ? null : 'STATUS')}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 text-blue-800 rounded-lg hover:bg-blue-100 transition"
            >
              🔄 Đổi trạng thái hàng loạt
            </button>
            <button
              onClick={() => setBulkActionType(bulkActionType === 'PRICE' ? null : 'PRICE')}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 text-blue-800 rounded-lg hover:bg-blue-100 transition"
            >
              💰 Điều chỉnh giá hàng loạt
            </button>
          </div>
        </div>
      )}

      {/* Bulk Status Modal/Dropdown drawer */}
      {bulkActionType === 'STATUS' && selectedIds.length > 0 && (
        <div className="bg-white border border-slate-300 rounded-xl p-4 mb-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Cập nhật trạng thái cho {selectedIds.length} căn hộ:
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="AVAILABLE">Còn hàng (AVAILABLE)</option>
              <option value="HOLD">Đang giữ (HOLD)</option>
              <option value="SOLD">Đã bán (SOLD)</option>
              <option value="LOCKED">Khóa giao dịch (LOCKED)</option>
              <option value="UNAVAILABLE">Không bán (UNAVAILABLE)</option>
            </select>
            <button
              disabled={isPending}
              onClick={handleExecuteBulkStatus}
              className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Đang cập nhật...' : 'Xác nhận đổi trạng thái'}
            </button>
            <button
              onClick={() => setBulkActionType(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Bulk Price Drawer */}
      {bulkActionType === 'PRICE' && selectedIds.length > 0 && (
        <div className="bg-white border border-slate-300 rounded-xl p-4 mb-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Cập nhật giá bán mới cho {selectedIds.length} căn hộ:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Giá mới (VNĐ)</label>
              <input
                type="text"
                placeholder="VD: 2500000000"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Lý do điều chỉnh (Price History)</label>
              <input
                type="text"
                value={bulkPriceReason}
                onChange={(e) => setBulkPriceReason(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={handleExecuteBulkPrice}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Đang cập nhật...' : 'Xác nhận cập nhật giá'}
            </button>
            <button
              onClick={() => setBulkActionType(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredUnits.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  onClick={() => handleSort('unitCode')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  Mã căn {sortField === 'unitCode' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  onClick={() => handleSort('buildingCode')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  Tòa {sortField === 'buildingCode' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  onClick={() => handleSort('floorNumber')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition select-none text-center"
                >
                  Tầng {sortField === 'floorNumber' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3">Loại căn</th>
                <th
                  onClick={() => handleSort('area')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition select-none text-right"
                >
                  Diện tích {sortField === 'area' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3">Hướng / View</th>
                <th
                  onClick={() => handleSort('basePrice')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition select-none text-right"
                >
                  Giá bán {sortField === 'basePrice' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Không tìm thấy căn hộ nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => {
                  const isSelected = selectedIds.includes(u.id)
                  const badge = STATUS_BADGES[u.status] || {
                    label: u.status,
                    className: 'bg-slate-100 text-slate-600',
                  }

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(u.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {u.unitCode}
                        {u.imageUrl && (
                          <span title="Có hình ảnh" className="ml-1 text-xs">
                            🖼️
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">{u.buildingCode}</td>
                      <td className="p-3 text-slate-700 text-center">{u.floorNumber}</td>
                      <td className="p-3 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                          {u.unitTypeName}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-800 font-medium">
                        {u.area.toFixed(1)} m²
                      </td>
                      <td className="p-3 text-slate-600 text-xs">
                        {u.direction && <span>{u.direction}</span>}
                        {u.direction && u.view && <span> • </span>}
                        {u.view && <span className="text-slate-500">{u.view}</span>}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        {formatVND(u.basePrice)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium transition"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(u.id, u.unitCode)}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-medium transition"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isEditModalOpen && editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUnit.id ? `Chỉnh sửa căn hộ ${editingUnit.unitCode}` : 'Thêm căn hộ mới'}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã căn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.unitCode || ''}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, unitCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tòa / Phân khu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.buildingCode || ''}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, buildingCode: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tầng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={editingUnit.floorNumber || 1}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, floorNumber: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại căn</label>
                  <input
                    type="text"
                    value={editingUnit.unitTypeName || ''}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, unitTypeName: e.target.value })
                    }
                    placeholder="VD: 1PN, 2PN, Studio"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diện tích (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingUnit.area || 0}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, area: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editingUnit.status || 'AVAILABLE'}
                    onChange={(e) => setEditingUnit({ ...editingUnit, status: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="AVAILABLE">Còn hàng (AVAILABLE)</option>
                    <option value="HOLD">Đang giữ (HOLD)</option>
                    <option value="SOLD">Đã bán (SOLD)</option>
                    <option value="LOCKED">Khóa (LOCKED)</option>
                    <option value="UNAVAILABLE">Không bán (UNAVAILABLE)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng</label>
                  <input
                    type="text"
                    value={editingUnit.direction || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, direction: e.target.value })}
                    placeholder="VD: Đông Nam, Tây Bắc"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">View</label>
                  <input
                    type="text"
                    value={editingUnit.view || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, view: e.target.value })}
                    placeholder="VD: Công viên, Hồ bơi"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá gốc (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={editingUnit.basePrice || 0}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-semibold"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    {formatVND(editingUnit.basePrice || 0)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link hình ảnh căn hộ (URL)
                  </label>
                  <input
                    type="text"
                    value={editingUnit.imageUrl || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Price change reason if updating existing unit */}
              {editingUnit.id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lý do thay đổi giá (ghi Price History)
                  </label>
                  <input
                    type="text"
                    value={priceChangeReason}
                    onChange={(e) => setPriceChangeReason(e.target.value)}
                    placeholder="VD: Bảng giá mới áp dụng từ tháng 10"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu căn hộ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
