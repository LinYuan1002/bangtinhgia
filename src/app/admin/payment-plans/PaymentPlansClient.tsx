'use client'

import React, { useState, useTransition } from 'react'
import { savePaymentPlan, savePaymentScheduleItems, deletePaymentPlan } from '@/app/admin/actions'

interface ScheduleItem {
  id?: string
  stepNumber: number
  name: string
  percentage: number
  dueDateNote?: string | null
  relativeDays?: number | null
}

interface PaymentPlanItem {
  id: string
  name: string
  type: string
  description?: string | null
  isActive: boolean
  scheduleItems: ScheduleItem[]
}

interface Props {
  initialPlans: any[]
}

export default function PaymentPlansClient({ initialPlans }: Props) {
  const [plans, setPlans] = useState<PaymentPlanItem[]>(initialPlans)
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planType, setPlanType] = useState('STANDARD')
  const [planDesc, setPlanDesc] = useState('')
  const [planActive, setPlanActive] = useState(true)
  const [steps, setSteps] = useState<
    { name: string; percentage: number; dueDateNote: string; relativeDays: number }[]
  >([
    { name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ký TTĐC', relativeDays: 0 },
    { name: 'Đợt 1 (Ký HĐMB)', percentage: 15, dueDateNote: 'T+15 ngày', relativeDays: 15 },
    { name: 'Đợt 2', percentage: 15, dueDateNote: 'T+60 ngày', relativeDays: 60 },
    { name: 'Đợt 3', percentage: 15, dueDateNote: 'T+120 ngày', relativeDays: 120 },
    { name: 'Đợt 4 (Bàn giao nhà)', percentage: 40, dueDateNote: 'Thông báo bàn giao', relativeDays: 240 },
    { name: 'Đợt 5 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Bàn giao sổ', relativeDays: 360 },
  ])

  const totalPercent = Math.round(steps.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100) / 100
  const isScheduleValid = totalPercent === 100

  const openCreateModal = () => {
    setEditingPlanId(null)
    setPlanName('')
    setPlanType('STANDARD')
    setPlanDesc('')
    setPlanActive(true)
    setSteps([
      { name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ký TTĐC', relativeDays: 0 },
      { name: 'Đợt 1 (Ký HĐMB)', percentage: 15, dueDateNote: 'T+15 ngày', relativeDays: 15 },
      { name: 'Đợt 2', percentage: 15, dueDateNote: 'T+60 ngày', relativeDays: 60 },
      { name: 'Đợt 3', percentage: 15, dueDateNote: 'T+120 ngày', relativeDays: 120 },
      { name: 'Đợt 4 (Bàn giao nhà)', percentage: 40, dueDateNote: 'Thông báo bàn giao', relativeDays: 240 },
      { name: 'Đợt 5 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Bàn giao sổ', relativeDays: 360 },
    ])
    setIsModalOpen(true)
  }

  const openEditModal = (plan: PaymentPlanItem) => {
    setEditingPlanId(plan.id)
    setPlanName(plan.name)
    setPlanType(plan.type)
    setPlanDesc(plan.description || '')
    setPlanActive(plan.isActive)
    setSteps(
      plan.scheduleItems.map((item) => ({
        name: item.name,
        percentage: item.percentage,
        dueDateNote: item.dueDateNote || '',
        relativeDays: item.relativeDays || 0,
      }))
    )
    setIsModalOpen(true)
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: `Đợt ${steps.length}`,
        percentage: 0,
        dueDateNote: '',
        relativeDays: 0,
      },
    ])
  }

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx))
  }

  const updateStep = (idx: number, field: string, val: any) => {
    setSteps(
      steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    )
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName) {
      alert('Vui lòng nhập tên phương án')
      return
    }

    if (!isScheduleValid && planActive) {
      alert('Tổng các đợt thanh toán phải bằng chính xác 100% mới được kích hoạt!')
      return
    }

    startTransition(async () => {
      // 1. Save Plan
      const planRes = await savePaymentPlan({
        id: editingPlanId,
        name: planName,
        type: planType,
        description: planDesc,
        isActive: isScheduleValid ? planActive : false,
      })

      if (planRes.error) {
        alert('Lỗi: ' + planRes.error)
        return
      }

      // If existing or newly created, refresh
      window.location.reload()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xóa phương án thanh toán "${name}"?`)) return
    startTransition(async () => {
      const res = await deletePaymentPlan(id)
      if (res.error) {
        alert('Lỗi khi xóa: ' + res.error)
        return
      }
      setPlans(plans.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Phương án & Lịch Thanh Toán</h1>
          <p className="text-sm text-slate-500">
            Hệ thống tự động kiểm tra tổng tỷ lệ đợt thanh toán = 100%. Không cho phép kích hoạt nếu sai.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          + Thêm phương án mới
        </button>
      </div>

      {/* List */}
      <div className="space-y-6">
        {plans.map((p) => {
          const sum =
            Math.round(
              p.scheduleItems.reduce((acc, item) => acc + item.percentage, 0) * 100
            ) / 100
          const valid = sum === 100

          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.type === 'FAST'
                          ? 'bg-amber-100 text-amber-800'
                          : p.type === 'LOAN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {p.type === 'FAST' ? 'Thanh toán sớm' : p.type === 'LOAN' ? 'Vay NH' : 'Tiến độ chuẩn'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                        valid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                      }`}
                    >
                      {valid ? '✓ Hợp lệ (100%)' : `⚠️ INVALID (${sum}%)`}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded font-medium"
                  >
                    Sửa tiến độ
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {/* Schedule steps table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase">
                    <tr>
                      <th className="p-2 w-12 text-center">Đợt</th>
                      <th className="p-2">Tên đợt thanh toán</th>
                      <th className="p-2 text-right">Tỷ lệ (%)</th>
                      <th className="p-2">Thời điểm thanh toán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.scheduleItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-medium text-slate-500">
                          {item.stepNumber || idx + 1}
                        </td>
                        <td className="p-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="p-2 text-right font-bold text-blue-600">
                          {item.percentage}%
                        </td>
                        <td className="p-2 text-slate-600">{item.dueDateNote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPlanId ? 'Chỉnh sửa phương án thanh toán' : 'Thêm phương án thanh toán mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên phương án <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="VD: Thanh toán chuẩn 6 đợt"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại phương án</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="STANDARD">Tiến độ chuẩn (STANDARD)</option>
                    <option value="FAST">Thanh toán sớm (FAST)</option>
                    <option value="LOAN">Vay ngân hàng (LOAN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {/* Dynamic Steps */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Các đợt thanh toán
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isScheduleValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800 animate-pulse'
                      }`}
                    >
                      Tổng: {totalPercent}% / 100% {isScheduleValid ? '✓' : '⚠️ INVALID'}
                    </span>
                    <button
                      type="button"
                      onClick={addStep}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                    >
                      + Thêm đợt
                    </button>
                  </div>
                </div>

                {!isScheduleValid && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 mb-3">
                    <strong>⚠️ INVALID PAYMENT SCHEDULE:</strong> Tổng tỷ lệ phần trăm các đợt phải bằng đúng 100% (hiện tại: {totalPercent}%). Vui lòng điều chỉnh trước khi kích hoạt.
                  </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-500 w-6 text-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Tên đợt (VD: Đợt 1)"
                        value={step.name}
                        onChange={(e) => updateStep(idx, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="%"
                          value={step.percentage}
                          onChange={(e) =>
                            updateStep(idx, 'percentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-right font-bold"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Thời điểm (VD: T+30)"
                        value={step.dueDateNote}
                        onChange={(e) => updateStep(idx, 'dueDateNote', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-rose-500 hover:text-rose-700 px-1 font-bold"
                        title="Xóa đợt"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                  disabled={isPending || (!isScheduleValid && planActive)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu phương án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
