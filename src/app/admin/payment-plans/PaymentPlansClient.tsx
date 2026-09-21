'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { savePaymentPlan, deletePaymentPlan } from '@/app/admin/actions'
import { getStoredPaymentPlans, saveStoredPaymentPlans, resetStoredPaymentPlansToDefault } from '@/lib/clientStore'
import { FALLBACK_PLANS } from '@/lib/fallback-data'

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
  const [plans, setPlans] = useState<PaymentPlanItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    const fallback = initialPlans.length > 0 ? initialPlans : FALLBACK_PLANS
    const stored = getStoredPaymentPlans(fallback)
    setPlans(stored)

    const handler = (e: any) => {
      if (e.detail) setPlans(e.detail)
    }
    window.addEventListener('sun_plans_updated', handler)
    return () => window.removeEventListener('sun_plans_updated', handler)
  }, [initialPlans])

  // Form states
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planType, setPlanType] = useState('STANDARD')
  const [planDesc, setPlanDesc] = useState('')
  const [planActive, setPlanActive] = useState(true)
  const [steps, setSteps] = useState<
    { name: string; percentage: number; dueDateNote: string; relativeDays: number }[]
  >([])

  const totalPercent =
    Math.round(steps.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100) / 100
  const isScheduleValid = totalPercent === 100
  const remainingPercent = Math.round((100 - totalPercent) * 100) / 100

  const openCreateModal = () => {
    setEditingPlanId(null)
    setPlanName('Tiến độ Vay Ngân Hàng HTLS 70%')
    setPlanType('LOAN')
    setPlanDesc('Hỗ trợ lãi suất 0%, ân hạn nợ gốc & miễn phí trả nợ trước hạn trong thời gian HTLS (5 đợt)')
    setPlanActive(true)
    setSteps([
      { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký TTĐC (Studio: 50tr, 1PN: 100tr, 2PN: 150tr, 3PN: 200tr)', relativeDays: 0 },
      { name: 'Đợt 2 (Ký HĐMB - Đóng đủ 15% gồm cọc)', percentage: 15, dueDateNote: 'Dự kiến 25/08/2026 (sau 15 ngày)', relativeDays: 15 },
      { name: 'Đợt 3 (Ngân hàng giải ngân 70%)', percentage: 70, dueDateNote: 'Trong vòng 15 ngày sau khi ký HĐMB', relativeDays: 30 },
      { name: 'Đợt 4 (Vốn tự có 10%)', percentage: 10, dueDateNote: 'Dự kiến 25/10/2026 (sau 60 ngày)', relativeDays: 60 },
      { name: 'Đợt 5 (Bàn giao & Cấp GCN)', percentage: 5, dueDateNote: 'Dự kiến 30/09/2027 (Kèm 100% KPBT 2% & thuế của 5%)', relativeDays: 360 },
    ])
    setIsModalOpen(true)
  }

  const openEditModal = (plan: PaymentPlanItem) => {
    setEditingPlanId(plan.id)
    setPlanName(plan.name)
    setPlanType(plan.type || 'STANDARD')
    setPlanDesc(plan.description || '')
    setPlanActive(plan.isActive ?? true)

    const rawSteps = Array.isArray(plan.scheduleItems) ? plan.scheduleItems : []
    if (rawSteps.length > 0) {
      setSteps(
        rawSteps.map((item) => ({
          name: item.name || '',
          percentage: Number(item.percentage) || 0,
          dueDateNote: item.dueDateNote || '',
          relativeDays: item.relativeDays || 0,
        }))
      )
    } else {
      setSteps([
        { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký TTĐC', relativeDays: 0 },
        { name: 'Đợt 2 (Ký HĐMB)', percentage: 100, dueDateNote: 'Sau 15 ngày', relativeDays: 15 },
      ])
    }
    setIsModalOpen(true)
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: `Đợt ${steps.length + 1}`,
        percentage: remainingPercent > 0 ? remainingPercent : 0,
        dueDateNote: '',
        relativeDays: 0,
      },
    ])
  }

  const removeStep = (idx: number) => {
    if (steps.length <= 1) {
      alert('Phương án phải có ít nhất 1 đợt thanh toán!')
      return
    }
    setSteps(steps.filter((_, i) => i !== idx))
  }

  const moveStep = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= steps.length) return
    const updated = [...steps]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setSteps(updated)
  }

  const updateStep = (idx: number, field: string, val: any) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s)))
  }

  const autoBalanceLastStep = () => {
    if (steps.length === 0) return
    const lastIdx = steps.length - 1
    const sumOthers = steps.slice(0, lastIdx).reduce((acc, cur) => acc + (Number(cur.percentage) || 0), 0)
    const needed = Math.max(0, Math.round((100 - sumOthers) * 100) / 100)
    updateStep(lastIdx, 'percentage', needed)
  }

  const applyPreset = (presetType: string) => {
    if (presetType === 'LOAN') {
      setPlanName('Phương án Vay Ngân Hàng 70% (HTLS 0%)')
      setPlanType('LOAN')
      setPlanDesc('Hỗ trợ lãi suất 0%, ân hạn nợ gốc & miễn phí trả nợ trước hạn trong thời gian HTLS (5 đợt)')
      setSteps([
        { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký TTĐC (Studio: 50tr, 1PN: 100tr, 2PN: 150tr, 3PN: 200tr)', relativeDays: 0 },
        { name: 'Đợt 2 (Ký HĐMB - Đóng đủ 15% gồm cọc)', percentage: 15, dueDateNote: 'Dự kiến 25/08/2026 (sau 15 ngày)', relativeDays: 15 },
        { name: 'Đợt 3 (Ngân hàng giải ngân 70%)', percentage: 70, dueDateNote: 'Trong vòng 15 ngày sau khi ký HĐMB', relativeDays: 30 },
        { name: 'Đợt 4 (Vốn tự có 10%)', percentage: 10, dueDateNote: 'Dự kiến 25/10/2026 (sau 60 ngày)', relativeDays: 60 },
        { name: 'Đợt 5 (Bàn giao & Cấp GCN)', percentage: 5, dueDateNote: 'Dự kiến 30/09/2027 (Kèm 100% KPBT 2% & thuế của 5%)', relativeDays: 360 },
      ])
    } else if (presetType === 'STD') {
      setPlanName('Tiến độ thanh toán chuẩn (17 đợt)')
      setPlanType('STANDARD')
      setPlanDesc('Thanh toán giãn đều định kỳ 2 tháng/lần đến khi nhận bàn giao căn hộ và sổ hồng')
      setSteps([
        { name: 'Đợt 1 (Ký TTĐC / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký TTĐC (Studio: 50tr, 1PN: 100tr, 2PN: 150tr, 3PN: 200tr)', relativeDays: 0 },
        { name: 'Đợt 2 (Ký HĐMB - Đóng đủ 15% gồm cọc)', percentage: 15, dueDateNote: 'Dự kiến 25/08/2026', relativeDays: 15 },
        { name: 'Đợt 3 (Thanh toán 10%)', percentage: 10, dueDateNote: 'Dự kiến 25/10/2026', relativeDays: 60 },
        { name: 'Đợt 4 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/12/2026', relativeDays: 120 },
        { name: 'Đợt 5 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/02/2027', relativeDays: 180 },
        { name: 'Đợt 6 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/04/2027', relativeDays: 240 },
        { name: 'Đợt 7 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/06/2027', relativeDays: 300 },
        { name: 'Đợt 8 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/08/2027', relativeDays: 360 },
        { name: 'Đợt 9 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/10/2027', relativeDays: 420 },
        { name: 'Đợt 10 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/12/2027', relativeDays: 480 },
        { name: 'Đợt 11 (Thanh toán 10%)', percentage: 10, dueDateNote: 'Dự kiến 25/02/2028', relativeDays: 540 },
        { name: 'Đợt 12 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/04/2028', relativeDays: 600 },
        { name: 'Đợt 13 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/06/2028', relativeDays: 660 },
        { name: 'Đợt 14 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/08/2028', relativeDays: 720 },
        { name: 'Đợt 15 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/10/2028', relativeDays: 780 },
        { name: 'Đợt 16 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 25/12/2028', relativeDays: 840 },
        { name: 'Đợt 17 (Bàn giao & Cấp GCN)', percentage: 5, dueDateNote: 'Dự kiến 30/09/2028 (Kèm 100% KPBT 2% & thuế của 5%)', relativeDays: 900 },
      ])
    } else if (presetType === 'TTS70') {
      setPlanName('Thanh toán sớm 70% (Hạn 25/08/2026)')
      setPlanType('FAST')
      setPlanDesc('Hưởng chiết khấu 4.5% khi thanh toán đủ 70% trước 25/08/2026, phần còn lại trả chậm 2 tháng/lần (8 đợt)')
      setSteps([
        { name: 'Đợt 1 (Ký HĐTHNV / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký HĐTHNV (Studio: 50tr, 1PN: 100tr, 2PN: 150tr, 3PN: 200tr)', relativeDays: 0 },
        { name: 'Đợt 2 (Thanh toán lần 2 - Đóng đủ 70% gồm cọc)', percentage: 70, dueDateNote: 'Muộn nhất ngày 25/08/2026', relativeDays: 15 },
        { name: 'Đợt 3 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 17/02/2028', relativeDays: 180 },
        { name: 'Đợt 4 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 17/04/2028', relativeDays: 240 },
        { name: 'Đợt 5 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 16/06/2028', relativeDays: 300 },
        { name: 'Đợt 6 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 15/08/2028', relativeDays: 360 },
        { name: 'Đợt 7 (Thanh toán 5%)', percentage: 5, dueDateNote: 'Dự kiến 14/10/2028', relativeDays: 420 },
        { name: 'Đợt 8 (Bàn giao & Cấp GCN)', percentage: 5, dueDateNote: 'Dự kiến 30/09/2028 (Kèm 100% KPBT 2% & thuế của 5%)', relativeDays: 480 },
      ])
    } else if (presetType === 'TTS95') {
      setPlanName('Thanh toán sớm 95% (Hạn 25/09/2026)')
      setPlanType('FAST')
      setPlanDesc('Hưởng chiết khấu tối đa 9.5% khi hoàn thành thanh toán 95% muộn nhất 25/09/2026 (3 đợt)')
      setSteps([
        { name: 'Đợt 1 (Ký HĐTHNV / Đặt cọc)', percentage: 0, dueDateNote: 'Ngay khi ký HĐTHNV (Studio: 50tr, 1PN: 100tr, 2PN: 150tr, 3PN: 200tr)', relativeDays: 0 },
        { name: 'Đợt 2 (Thanh toán lần 2 - Đóng đủ 95% gồm cọc)', percentage: 95, dueDateNote: 'Muộn nhất ngày 25/09/2026', relativeDays: 15 },
        { name: 'Đợt 3 (Bàn giao & Cấp GCN)', percentage: 5, dueDateNote: 'Dự kiến 30/09/2027 (Kèm 100% KPBT 2% & thuế của 5%)', relativeDays: 360 },
      ])
    }
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName.trim()) {
      alert('Vui lòng nhập tên phương án')
      return
    }

    if (!isScheduleValid && planActive) {
      alert('Tổng tỷ lệ các đợt thanh toán phải bằng chính xác 100% mới được kích hoạt phương án!')
      return
    }

    const planPayload: PaymentPlanItem = {
      id: editingPlanId || 'plan-' + Date.now(),
      name: planName.trim(),
      type: planType,
      description: planDesc.trim() || null,
      isActive: isScheduleValid ? planActive : false,
      scheduleItems: steps.map((s, idx) => ({
        stepNumber: idx + 1,
        name: s.name.trim() || `Đợt ${idx + 1}`,
        percentage: Number(s.percentage) || 0,
        dueDateNote: s.dueDateNote.trim() || null,
        relativeDays: s.relativeDays || 0,
      })),
    }

    let updated: PaymentPlanItem[]
    if (editingPlanId) {
      updated = plans.map((p) => (p.id === editingPlanId ? planPayload : p))
    } else {
      updated = [planPayload, ...plans]
    }

    saveStoredPaymentPlans(updated)
    setPlans(updated)
    setIsModalOpen(false)
    showToast(`Đã lưu tiến độ thanh toán cho "${planPayload.name}" thành công!`)

    startTransition(async () => {
      try {
        await savePaymentPlan(planPayload)
      } catch (err) {
        console.warn('Background server plan save note:', err)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa phương án thanh toán "${name}"?`)) return
    const updated = plans.filter((p) => p.id !== id)
    saveStoredPaymentPlans(updated)
    setPlans(updated)
    showToast(`Đã xóa phương án "${name}"`)

    startTransition(async () => {
      try {
        await deletePaymentPlan(id)
      } catch (err) {
        console.warn('Background server plan delete note:', err)
      }
    })
  }

  const handleResetToOfficialExcel = async () => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục lại 4 phương án tiến độ thanh toán chuẩn từ file Excel của Sun Group không?')) return
    const updated = resetStoredPaymentPlansToDefault(FALLBACK_PLANS)
    setPlans(updated)
    showToast('Đã khôi phục thành công 4 phương án thanh toán chuẩn từ file Excel!')
    startTransition(async () => {
      try {
        for (const p of FALLBACK_PLANS) {
          await savePaymentPlan(p)
        }
      } catch (err) {
        console.warn('Sync fallback error:', err)
      }
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <span className="text-emerald-400 font-bold">✓</span> {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl text-xl">📅</span>
            Phương Án & Tiến Độ Thanh Toán
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản trị viên có thể <strong>chỉnh sửa tỷ lệ %, tên đợt và thời điểm thanh toán</strong> trực tiếp. Mọi thay đổi sẽ cập nhật đồng bộ sang Bảng tính giá.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetToOfficialExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
            title="Đồng bộ lại toàn bộ 4 phương án tiến độ từ file Excel của Sun Group"
          >
            🔄 Khôi phục 4 phương án gốc Excel
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-sm shadow-blue-500/20"
          >
            + Thêm Phương Án Mới
          </button>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-6">
        {plans.map((p) => {
          const sum =
            Math.round(
              (p.scheduleItems || []).reduce((acc, item) => acc + (Number(item.percentage) || 0), 0) * 100
            ) / 100
          const valid = sum === 100

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-extrabold text-slate-900 text-base">{p.name}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                        p.type === 'FAST'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : p.type === 'LOAN'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {p.type === 'FAST' ? '⚡ Thanh toán sớm' : p.type === 'LOAN' ? '🏦 Vay ngân hàng' : '📋 Tiến độ chuẩn'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                        valid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                      }`}
                    >
                      {valid ? '✓ Tổng: 100%' : `⚠️ Tổng ${sum}% (Cần đủ 100%)`}
                    </span>
                    {!p.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                        Tạm dừng
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-500 mt-1.5">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(p)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold transition"
                  >
                    ✏️ Sửa Tiến Độ
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>

              {/* Schedule steps table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-14 text-center font-bold">Đợt</th>
                      <th className="p-2.5 font-bold">Nội dung đợt thanh toán</th>
                      <th className="p-2.5 text-right font-bold w-24">Tỷ lệ (%)</th>
                      <th className="p-2.5 font-bold">Mốc thời gian quy định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(p.scheduleItems || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-2.5 text-center font-bold text-slate-600">
                          #{item.stepNumber || idx + 1}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.name}</td>
                        <td className="p-2.5 text-right font-black text-blue-700">
                          {item.percentage}%
                        </td>
                        <td className="p-2.5 text-slate-600">{item.dueDateNote || 'Theo tiến độ thi công'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl overflow-y-auto max-h-[92vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📅</span>
                  {editingPlanId ? 'Chỉnh Sửa Tiến Độ Thanh Toán' : 'Thêm Phương Án Thanh Toán Mới'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thay đổi tỷ lệ %, tên gọi và thời điểm nộp tiền cho từng đợt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Presets Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  ⚡ Mẫu tiến độ chuẩn từ Excel Sun Group (Click để áp dụng nhanh):
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('LOAN')}
                    className="px-3 py-1 text-xs bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg font-bold text-purple-800 shadow-xs"
                  >
                    🏦 Vay NH 70% (5 đợt - HTLS 0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('STD')}
                    className="px-3 py-1 text-xs bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg font-bold text-blue-800 shadow-xs"
                  >
                    📋 Tiến độ chuẩn 17 đợt (Ảnh Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('TTS70')}
                    className="px-3 py-1 text-xs bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg font-bold text-amber-800 shadow-xs"
                  >
                    ⚡ TTS 70% (8 đợt - CK 4.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('TTS95')}
                    className="px-3 py-1 text-xs bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg font-bold text-emerald-800 shadow-xs"
                  >
                    ⚡ TTS 95% (3 đợt - CK 9.5%)
                  </button>
                </div>
              </div>

              {/* Main Plan Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên phương án thanh toán <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="VD: Thanh toán sớm 95% (Hạn 25/09/2026)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    <option value="FAST">Thanh toán sớm (FAST)</option>
                    <option value="STANDARD">Tiến độ chuẩn (STANDARD)</option>
                    <option value="LOAN">Vay ngân hàng (LOAN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Ghi chú</label>
                <input
                  type="text"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="VD: Chiết khấu 9.5% khi hoàn thành thanh toán 95% trước 25/09/2026"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium"
                />
              </div>

              {/* Dynamic Steps */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Danh sách các đợt thanh toán ({steps.length} đợt)
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        isScheduleValid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      }`}
                    >
                      Tổng: {totalPercent}% / 100% {isScheduleValid ? '✓' : `(Còn thiếu ${remainingPercent}%)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isScheduleValid && steps.length > 0 && (
                      <button
                        type="button"
                        onClick={autoBalanceLastStep}
                        className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold"
                        title="Tự động chỉnh đợt cuối cùng để tổng vừa đủ 100%"
                      >
                        ⚖️ Tự cân bằng 100%
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={addStep}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                    >
                      + Thêm đợt
                    </button>
                  </div>
                </div>

                {!isScheduleValid && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    ⚠️ Tổng tỷ lệ phần trăm các đợt phải bằng đúng 100% (hiện tại: <strong>{totalPercent}%</strong>). Bạn có thể bấm nút <strong>"Tự cân bằng 100%"</strong> hoặc chỉnh lại % các đợt.
                  </div>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs hover:border-slate-300 transition"
                    >
                      {/* Step order & Move buttons */}
                      <div className="flex items-center gap-1 w-12 shrink-0">
                        <span className="font-extrabold text-slate-600 w-5 text-center">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, idx - 1)}
                            className="text-[10px] text-slate-500 hover:text-slate-900 disabled:opacity-20 leading-none p-0.5"
                            title="Di chuyển lên"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === steps.length - 1}
                            onClick={() => moveStep(idx, idx + 1)}
                            className="text-[10px] text-slate-500 hover:text-slate-900 disabled:opacity-20 leading-none p-0.5"
                            title="Di chuyển xuống"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Step Name */}
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Tên đợt (VD: Đợt 1 - Ký HĐMB)"
                          value={step.name}
                          onChange={(e) => updateStep(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                        />
                      </div>

                      {/* Percentage */}
                      <div className="flex items-center gap-1 shrink-0 w-24">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                          placeholder="%"
                          value={step.percentage}
                          onChange={(e) =>
                            updateStep(idx, 'percentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-right font-black text-blue-700"
                        />
                        <span className="font-bold text-slate-600">%</span>
                      </div>

                      {/* Due Date Note */}
                      <div className="w-44 shrink-0">
                        <input
                          type="text"
                          placeholder="Mốc thời gian (VD: Muộn nhất 25/09/2026)"
                          value={step.dueDateNote}
                          onChange={(e) => updateStep(idx, 'dueDateNote', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg font-bold shrink-0 transition"
                        title="Xóa đợt này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={planActive}
                    onChange={(e) => setPlanActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Kích hoạt phương án này ngay</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || (!isScheduleValid && planActive)}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {isPending ? 'Đang lưu...' : 'Lưu Phương Án & Tiến Độ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
