'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { savePolicy, updatePolicyStatus, deletePolicy } from '@/app/admin/actions'
import { formatVND } from '@/lib/calculations'
import { getStoredPolicies, saveStoredPolicies } from '@/lib/clientStore'

interface PolicyItem {
  id: string
  name: string
  description?: string | null
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  discountPercent: number
  fixedDiscount: number
  earlyPaymentDiscount: number
  earlyPaymentDiscountPct: number
  specialDiscount: number
  giftValue: number
  discountMode: string
  status: string
  priority: number
}

interface Props {
  initialPolicies: any[]
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Bản nháp (DRAFT)', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  ACTIVE: { label: 'Đang áp dụng (ACTIVE)', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  EXPIRED: { label: 'Hết hạn (EXPIRED)', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  ARCHIVED: { label: 'Lưu trữ (ARCHIVED)', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
}

export default function PoliciesClient({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState<PolicyItem[]>(initialPolicies)
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Partial<PolicyItem> | null>(null)

  useEffect(() => {
    const stored = getStoredPolicies(initialPolicies)
    setPolicies(stored)
    const handler = (e: any) => {
      if (e.detail) setPolicies(e.detail)
    }
    window.addEventListener('sun_policies_updated', handler)
    return () => window.removeEventListener('sun_policies_updated', handler)
  }, [initialPolicies])

  const openCreateModal = () => {
    setEditingPolicy({
      name: '',
      description: '',
      discountPercent: 0,
      fixedDiscount: 0,
      earlyPaymentDiscountPct: 0,
      earlyPaymentDiscount: 0,
      specialDiscount: 0,
      giftValue: 0,
      discountMode: 'STACKED',
      status: 'DRAFT',
      priority: policies.length + 1,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (p: PolicyItem) => {
    setEditingPolicy({ ...p })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPolicy?.name) {
      alert('Vui lòng nhập tên chính sách')
      return
    }

    const policyPayload = {
      ...editingPolicy,
      id: editingPolicy.id || 'policy-' + Date.now(),
    }
    let updated: PolicyItem[]
    if (editingPolicy.id) {
      updated = policies.map((p) => (p.id === editingPolicy.id ? (policyPayload as any) : p))
    } else {
      updated = [policyPayload as any, ...policies]
    }
    saveStoredPolicies(updated)
    setPolicies(updated)
    setIsModalOpen(false)

    startTransition(async () => {
      try {
        await savePolicy(policyPayload)
      } catch (err) {
        console.warn('Background server policy save note:', err)
      }
    })
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updated = policies.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    saveStoredPolicies(updated)
    setPolicies(updated)

    startTransition(async () => {
      try {
        await updatePolicyStatus(id, newStatus)
      } catch (err) {
        console.warn('Background server policy status note:', err)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xóa chính sách "${name}"?`)) return
    const updated = policies.filter((p) => p.id !== id)
    saveStoredPolicies(updated)
    setPolicies(updated)

    startTransition(async () => {
      try {
        await deletePolicy(id)
      } catch (err) {
        console.warn('Background server policy delete note:', err)
      }
    })
  }


  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chính sách Bán hàng & Chiết khấu</h1>
          <p className="text-sm text-slate-500">
            Cấu hình tỷ lệ chiết khấu, phương thức tính (STACKED / SEQUENTIAL) và thời hạn áp dụng
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          + Thêm chính sách mới
        </button>
      </div>

      {/* Policies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((p) => {
          const badge = STATUS_MAP[p.status] || { label: p.status, className: 'bg-slate-100' }
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{p.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{p.description}</p>
                )}

                <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs text-slate-700 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chiết khấu %:</span>
                    <span className="font-semibold text-blue-600">{p.discountPercent}%</span>
                  </div>
                  {p.fixedDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chiết khấu cố định:</span>
                      <span className="font-semibold">{formatVND(p.fixedDiscount)}</span>
                    </div>
                  )}
                  {p.earlyPaymentDiscountPct > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">CK Thanh toán sớm (%):</span>
                      <span className="font-semibold text-emerald-600">
                        {p.earlyPaymentDiscountPct}%
                      </span>
                    </div>
                  )}
                  {p.giftValue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quà tặng:</span>
                      <span className="font-semibold text-purple-600">{formatVND(p.giftValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Phương thức tính:</span>
                    <span className="font-medium bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                      {p.discountMode === 'SEQUENTIAL' ? 'Lũy kế (SEQUENTIAL)' : 'Cộng dồn (STACKED)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <select
                  value={p.status}
                  onChange={(e) => handleStatusChange(p.id, e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>

                <div className="space-x-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {isModalOpen && editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPolicy.id ? 'Sửa chính sách bán hàng' : 'Thêm chính sách bán hàng'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chính sách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ưu đãi đợt 1 - Early Bird"
                  value={editingPolicy.name || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={2}
                  value={editingPolicy.description || ''}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chiết khấu (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPolicy.discountPercent || 0}
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        discountPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chiết khấu cố định (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={editingPolicy.fixedDiscount || 0}
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        fixedDiscount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CK Thanh toán sớm (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPolicy.earlyPaymentDiscountPct || 0}
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        earlyPaymentDiscountPct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá trị Quà tặng (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={editingPolicy.giftValue || 0}
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        giftValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phương thức tính chiết khấu
                  </label>
                  <select
                    value={editingPolicy.discountMode || 'STACKED'}
                    onChange={(e) =>
                      setEditingPolicy({ ...editingPolicy, discountMode: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="STACKED">Cộng dồn (STACKED: Giá gốc × Tổng %)</option>
                    <option value="SEQUENTIAL">Lũy kế (SEQUENTIAL: Trừ dần từng bước)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingPolicy.status || 'DRAFT'}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, status: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="DRAFT">DRAFT (Bản nháp)</option>
                    <option value="ACTIVE">ACTIVE (Đang áp dụng)</option>
                    <option value="EXPIRED">EXPIRED (Hết hiệu lực)</option>
                    <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu chính sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
