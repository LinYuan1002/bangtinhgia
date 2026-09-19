'use client'

import React, { useState, useTransition } from 'react'
import { saveLoanProgram, deleteLoanProgram } from '@/app/admin/actions'

interface LoanProgramItem {
  id: string
  name: string
  bankName: string
  annualInterestRate: number
  interestRateType: string
  maxLoanPercent: number
  maxLoanTermMonths: number
  repaymentMethod: string
  interestSupport: boolean
  supportRate: number
  supportPeriodMonths: number
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  status: string
  notes?: string | null
}

interface Props {
  initialPrograms: any[]
}

export default function LoanProgramsClient({ initialPrograms }: Props) {
  const [programs, setPrograms] = useState<LoanProgramItem[]>(initialPrograms)
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProg, setEditingProg] = useState<Partial<LoanProgramItem> | null>(null)

  const openCreateModal = () => {
    setEditingProg({
      name: '',
      bankName: '',
      annualInterestRate: 8.5,
      interestRateType: 'FIXED',
      maxLoanPercent: 70,
      maxLoanTermMonths: 240,
      repaymentMethod: 'EQUAL_PAYMENT',
      interestSupport: false,
      supportRate: 0,
      supportPeriodMonths: 0,
      status: 'ACTIVE',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (prog: LoanProgramItem) => {
    setEditingProg({ ...prog })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProg?.name) {
      alert('Vui lòng nhập tên chương trình vay')
      return
    }

    startTransition(async () => {
      const res = await saveLoanProgram(editingProg)
      if (res.error) {
        alert('Lỗi: ' + res.error)
        return
      }
      setIsModalOpen(false)
      window.location.reload()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xóa chương trình vay "${name}"?`)) return
    startTransition(async () => {
      const res = await deleteLoanProgram(id)
      if (res.error) {
        alert('Lỗi khi xóa: ' + res.error)
        return
      }
      setPrograms(programs.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chương trình Vay Ngân Hàng</h1>
          <p className="text-sm text-slate-500">
            Quản lý các gói vay, lãi suất, hạn mức giải ngân tối đa và chính sách hỗ trợ lãi suất
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          + Thêm gói vay mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                    {p.bankName || 'Ngân hàng đối tác'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1 leading-snug">{p.name}</h3>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    p.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {p.notes && <p className="text-xs text-slate-500 mb-4">{p.notes}</p>}

              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs text-slate-700 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lãi suất năm:</span>
                  <span className="font-bold text-blue-600">
                    {p.annualInterestRate}% ({p.interestRateType})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạn mức vay tối đa:</span>
                  <span className="font-semibold text-slate-800">{p.maxLoanPercent}% giá trị HĐ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian vay tối đa:</span>
                  <span className="font-semibold">{p.maxLoanTermMonths / 12} năm ({p.maxLoanTermMonths} tháng)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phương thức trả nợ:</span>
                  <span className="font-medium">
                    {p.repaymentMethod === 'EQUAL_PRINCIPAL' ? 'Dư nợ giảm dần' : 'Trả đều hàng tháng (PMT)'}
                  </span>
                </div>
                {p.interestSupport && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-700 font-medium">
                    <span>Hỗ trợ lãi suất:</span>
                    <span>
                      {p.supportRate}% trong {p.supportPeriodMonths} tháng
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
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
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && editingProg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProg.id ? 'Sửa chương trình vay' : 'Thêm chương trình vay mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chương trình <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Gói vay ưu đãi Vietcombank"
                    value={editingProg.name || ''}
                    onChange={(e) => setEditingProg({ ...editingProg, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên ngân hàng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Vietcombank, MB, VPBank"
                    value={editingProg.bankName || ''}
                    onChange={(e) => setEditingProg({ ...editingProg, bankName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lãi suất chuẩn (%/năm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingProg.annualInterestRate || 0}
                    onChange={(e) =>
                      setEditingProg({
                        ...editingProg,
                        annualInterestRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vay tối đa (% HĐ)
                  </label>
                  <input
                    type="number"
                    value={editingProg.maxLoanPercent || 70}
                    onChange={(e) =>
                      setEditingProg({
                        ...editingProg,
                        maxLoanPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời hạn (tháng)
                  </label>
                  <input
                    type="number"
                    value={editingProg.maxLoanTermMonths || 240}
                    onChange={(e) =>
                      setEditingProg({
                        ...editingProg,
                        maxLoanTermMonths: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phương thức trả gốc & lãi
                  </label>
                  <select
                    value={editingProg.repaymentMethod || 'EQUAL_PAYMENT'}
                    onChange={(e) =>
                      setEditingProg({ ...editingProg, repaymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="EQUAL_PAYMENT">Trả đều hàng tháng (Niên kim / PMT)</option>
                    <option value="EQUAL_PRINCIPAL">Dư nợ giảm dần (Gốc cố định)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editingProg.status || 'ACTIVE'}
                    onChange={(e) => setEditingProg({ ...editingProg, status: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="ACTIVE">ACTIVE (Đang hỗ trợ)</option>
                    <option value="INACTIVE">INACTIVE (Tạm dừng)</option>
                  </select>
                </div>
              </div>

              {/* Support Checkbox */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingProg.interestSupport ?? false}
                    onChange={(e) =>
                      setEditingProg({ ...editingProg, interestSupport: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Có chính sách Hỗ Trợ Lãi Suất của CĐT (0% hoặc ưu đãi)
                </label>

                {editingProg.interestSupport && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Lãi suất ưu đãi (%/năm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="VD: 0 cho lãi suất 0%"
                        value={editingProg.supportRate || 0}
                        onChange={(e) =>
                          setEditingProg({
                            ...editingProg,
                            supportRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Thời gian hỗ trợ (tháng)
                      </label>
                      <input
                        type="number"
                        placeholder="VD: 18 hoặc 24"
                        value={editingProg.supportPeriodMonths || 0}
                        onChange={(e) =>
                          setEditingProg({
                            ...editingProg,
                            supportPeriodMonths: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
                <input
                  type="text"
                  value={editingProg.notes || ''}
                  onChange={(e) => setEditingProg({ ...editingProg, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
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
                  {isPending ? 'Đang lưu...' : 'Lưu chương trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
