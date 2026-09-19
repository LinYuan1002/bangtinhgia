'use client'

import React, { useState, useTransition } from 'react'
import { saveBuilding, deleteBuilding } from '@/app/admin/actions'

interface BuildingItem {
  id: string
  name: string
  code: string
  totalFloors: number
  description?: string | null
  _count?: { units: number }
}

interface Props {
  initialBuildings: any[]
}

export default function BuildingsClient({ initialBuildings }: Props) {
  const [buildings, setBuildings] = useState<BuildingItem[]>(initialBuildings)
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Partial<BuildingItem> | null>(null)

  const openCreateModal = () => {
    setEditingBuilding({
      name: '',
      code: '',
      totalFloors: 25,
      description: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (b: BuildingItem) => {
    setEditingBuilding({ ...b })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBuilding?.name || !editingBuilding?.code) {
      alert('Vui lòng nhập tên và mã tòa')
      return
    }

    startTransition(async () => {
      const res = await saveBuilding(editingBuilding)
      if (res.error) {
        alert('Lỗi: ' + res.error)
        return
      }
      setIsModalOpen(false)
      window.location.reload()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xóa tòa "${name}"?`)) return
    startTransition(async () => {
      const res = await deleteBuilding(id)
      if (res.error) {
        alert('Lỗi: ' + res.error)
        return
      }
      setBuildings(buildings.filter((b) => b.id !== id))
    })
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý Tòa & Phân Khu</h1>
          <p className="text-sm text-slate-500">Danh sách các tòa nhà / phân khu thuộc dự án</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          + Thêm tòa mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {buildings.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                  {b.code}
                </span>
                <span className="text-xs text-slate-500">
                  {b._count?.units || 0} căn hộ
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{b.name}</h3>
              <p className="text-xs text-slate-600 mb-2">Số tầng: <strong>{b.totalFloors}</strong> tầng</p>
              {b.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{b.description}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 mt-4">
              <button
                onClick={() => openEditModal(b)}
                className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(b.id, b.name)}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-medium"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingBuilding.id ? 'Sửa thông tin tòa' : 'Thêm tòa mới'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã tòa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: S1, S2, CANOPY"
                  value={editingBuilding.code || ''}
                  onChange={(e) =>
                    setEditingBuilding({ ...editingBuilding, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tòa Park 1 (S1)"
                  value={editingBuilding.name || ''}
                  onChange={(e) =>
                    setEditingBuilding({ ...editingBuilding, name: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số tầng</label>
                <input
                  type="number"
                  value={editingBuilding.totalFloors || 25}
                  onChange={(e) =>
                    setEditingBuilding({
                      ...editingBuilding,
                      totalFloors: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={editingBuilding.description || ''}
                  onChange={(e) =>
                    setEditingBuilding({ ...editingBuilding, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
