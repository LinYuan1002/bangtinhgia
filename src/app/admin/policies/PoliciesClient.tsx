'use client'

import React, { useState, useTransition, useEffect, useMemo } from 'react'
import {
  savePolicy,
  updatePolicyStatus,
  deletePolicy,
  updatePolicyGroupBuildings,
} from '@/app/admin/actions'
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
  groupName?: string | null
  applicableBuildings?: string | null
}

interface Props {
  initialPolicies: any[]
  availableBuildings?: string[]
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Bản nháp (DRAFT)', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  ACTIVE: { label: 'Đang áp dụng (ACTIVE)', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  EXPIRED: { label: 'Hết hạn (EXPIRED)', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  ARCHIVED: { label: 'Lưu trữ (ARCHIVED)', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
}

export default function PoliciesClient({ initialPolicies, availableBuildings = ['P12', 'P11', 'S1', 'S2'] }: Props) {
  const [policies, setPolicies] = useState<PolicyItem[]>(initialPolicies)
  const [isPending, startTransition] = useTransition()
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Partial<PolicyItem> | null>(null)
  
  // Group buildings management modal
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false)
  const [selectedGroupForBuildings, setSelectedGroupForBuildings] = useState<{ groupName: string; buildings: string } | null>(null)
  const [modalBuildingChecklist, setModalBuildingChecklist] = useState<string[]>([])
  const [modalIsAllBuildings, setModalIsAllBuildings] = useState(false)
  const [modalCustomBuilding, setModalCustomBuilding] = useState('')

  // New Group creation modal
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupBuildings, setNewGroupBuildings] = useState<string[]>(['P12'])
  const [newGroupIsAll, setNewGroupIsAll] = useState(false)

  // Filters
  const [filterGroup, setFilterGroup] = useState<string>('ALL')
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL')

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    const stored = getStoredPolicies(initialPolicies)
    setPolicies(stored)
    const handler = (e: any) => {
      if (e.detail) setPolicies(e.detail)
    }
    window.addEventListener('sun_policies_updated', handler)
    return () => window.removeEventListener('sun_policies_updated', handler)
  }, [initialPolicies])

  // Extract policy groups
  const policyGroups = useMemo(() => {
    const map = new Map<string, { groupName: string; buildings: string; count: number; policies: PolicyItem[] }>()
    for (const p of policies) {
      const gName = p.groupName?.trim() || 'Chính sách chung'
      if (!map.has(gName)) {
        map.set(gName, {
          groupName: gName,
          buildings: p.applicableBuildings?.trim() || 'ALL',
          count: 0,
          policies: [],
        })
      }
      const entry = map.get(gName)!
      entry.count++
      entry.policies.push(p)
      if (p.applicableBuildings && p.applicableBuildings !== 'ALL') {
        entry.buildings = p.applicableBuildings
      }
    }
    return Array.from(map.values())
  }, [policies])

  // All unique building codes across policies and availableBuildings
  const allKnownBuildings = useMemo(() => {
    const set = new Set<string>(availableBuildings)
    policies.forEach((p) => {
      if (p.applicableBuildings && p.applicableBuildings !== 'ALL') {
        p.applicableBuildings.split(',').forEach((b) => {
          const trimmed = b.trim().toUpperCase()
          if (trimmed) set.add(trimmed)
        })
      }
    })
    return Array.from(set).sort()
  }, [policies, availableBuildings])

  // Filtered policies list
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (filterGroup !== 'ALL') {
        const gName = p.groupName?.trim() || 'Chính sách chung'
        if (gName !== filterGroup) return false
      }
      if (filterBuilding !== 'ALL') {
        const app = (p.applicableBuildings || 'ALL').trim().toUpperCase()
        if (app !== 'ALL') {
          const list = app.split(',').map((s) => s.trim().toUpperCase())
          if (!list.includes(filterBuilding.toUpperCase())) return false
        }
      }
      return true
    })
  }, [policies, filterGroup, filterBuilding])

  const openCreateModal = (defaultGroup?: string) => {
    const targetGroup = defaultGroup || (policyGroups[0]?.groupName ?? 'Chính sách chung')
    const matchedGroup = policyGroups.find((g) => g.groupName === targetGroup)
    setEditingPolicy({
      name: '',
      description: '',
      discountPercent: 0,
      fixedDiscount: 0,
      earlyPaymentDiscountPct: 0,
      earlyPaymentDiscount: 0,
      specialDiscount: 0,
      giftValue: 0,
      discountMode: 'SEQUENTIAL',
      status: 'ACTIVE',
      priority: policies.length + 1,
      groupName: targetGroup,
      applicableBuildings: matchedGroup?.buildings || 'ALL',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (p: PolicyItem) => {
    setEditingPolicy({ ...p })
    setIsModalOpen(true)
  }

  // Open Group Building Assignment modal
  const openBuildingModal = (group: { groupName: string; buildings: string }) => {
    setSelectedGroupForBuildings(group)
    const isAll = !group.buildings || group.buildings === 'ALL'
    setModalIsAllBuildings(isAll)
    if (isAll) {
      setModalBuildingChecklist([])
    } else {
      setModalBuildingChecklist(group.buildings.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    }
    setModalCustomBuilding('')
    setIsBuildingModalOpen(true)
  }

  // Save updated buildings for an entire group
  const handleSaveGroupBuildings = async () => {
    if (!selectedGroupForBuildings) return
    let finalBuildings = 'ALL'
    if (!modalIsAllBuildings) {
      const list = [...modalBuildingChecklist]
      if (modalCustomBuilding.trim()) {
        const customs = modalCustomBuilding.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        list.push(...customs)
      }
      const unique = Array.from(new Set(list))
      finalBuildings = unique.length > 0 ? unique.join(',') : 'ALL'
    }

    const targetGroup = selectedGroupForBuildings.groupName
    const updated = policies.map((p) => {
      const g = p.groupName?.trim() || 'Chính sách chung'
      if (g === targetGroup) {
        return { ...p, applicableBuildings: finalBuildings }
      }
      return p
    })

    saveStoredPolicies(updated)
    setPolicies(updated)
    setIsBuildingModalOpen(false)
    showToast(`Đã cập nhật tòa áp dụng cho nhóm "${targetGroup}": ${finalBuildings}`)

    startTransition(async () => {
      try {
        await updatePolicyGroupBuildings(targetGroup, finalBuildings)
      } catch (err) {
        console.warn('Background updatePolicyGroupBuildings error:', err)
      }
    })
  }

  // Handle Create New Group
  const handleCreateNewGroup = () => {
    if (!newGroupName.trim()) {
      alert('Vui lòng nhập tên nhóm chính sách')
      return
    }
    const bldg = newGroupIsAll ? 'ALL' : (newGroupBuildings.length > 0 ? newGroupBuildings.join(',') : 'ALL')
    // Open create policy modal pre-filled with this new group
    setIsCreateGroupModalOpen(false)
    setEditingPolicy({
      name: '',
      description: '',
      discountPercent: 0,
      fixedDiscount: 0,
      earlyPaymentDiscountPct: 0,
      earlyPaymentDiscount: 0,
      specialDiscount: 0,
      giftValue: 0,
      discountMode: 'SEQUENTIAL',
      status: 'ACTIVE',
      priority: policies.length + 1,
      groupName: newGroupName.trim(),
      applicableBuildings: bldg,
    })
    setIsModalOpen(true)
    showToast(`Đã tạo nhóm "${newGroupName.trim()}". Hãy tạo chính sách đầu tiên cho nhóm.`)
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
      groupName: editingPolicy.groupName?.trim() || 'Chính sách chung',
      applicableBuildings: editingPolicy.applicableBuildings?.trim() || 'ALL',
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
    showToast(`Đã lưu chính sách "${policyPayload.name}" thành công!`)

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
    showToast(`Đã xóa chính sách "${name}"`)

    startTransition(async () => {
      try {
        await deletePolicy(id)
      } catch (err) {
        console.warn('Background server policy delete note:', err)
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Chính Sách & Nhóm CSBH Theo Tòa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cấu hình nhóm chính sách riêng biệt cho từng tòa (P12, S1, S2...) hoặc gán nhiều tòa dùng chung một nhóm chính sách.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-xs"
          >
            🏢 + Tạo nhóm CSBH mới
          </button>
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            + Thêm chính sách mới
          </button>
        </div>
      </div>

      {/* ── SECTION: NHÓM CHÍNH SÁCH THEO TÒA (POLICY GROUPS MANAGER) ── */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              Các Nhóm Chính Sách Đang Hoạt Động ({policyGroups.length} nhóm)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Gán / Thêm Tòa Áp Dụng&quot; để gán thêm tòa (P11, S2...) vào nhóm nếu có chính sách giống nhau.
            </p>
          </div>
          <div className="text-xs text-slate-600">
            Tổng cộng: <strong className="text-blue-700 font-bold">{policies.length}</strong> chính sách
          </div>
        </div>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policyGroups.map((group) => {
            const isAll = !group.buildings || group.buildings === 'ALL'
            const bldgList = isAll ? ['Tất cả các tòa'] : group.buildings.split(',').map((s) => s.trim())
            const isFilteringThis = filterGroup === group.groupName

            return (
              <div
                key={group.groupName}
                className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                  isFilteringThis ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30' : 'border-slate-200 hover:border-blue-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                      {group.groupName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 shrink-0">
                      {group.count} CS
                    </span>
                  </div>

                  {/* Buildings badges */}
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <span>🏢 Tòa áp dụng:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bldgList.map((b, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isAll
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {isAll ? '🌟 Tất cả tòa (ALL)' : `Tòa ${b}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Group Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openBuildingModal(group)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold transition"
                    title="Gán thêm tòa hoặc thay đổi tòa áp dụng cho nhóm này"
                  >
                    🏢 Gán / Thêm Tòa
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFilterGroup(isFilteringThis ? 'ALL' : group.groupName)}
                      className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                        isFilteringThis
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Lọc danh sách chỉ hiện chính sách thuộc nhóm này"
                    >
                      {isFilteringThis ? 'Đang lọc' : 'Lọc'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateModal(group.groupName)}
                      className="px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold"
                      title="Thêm chính sách mới vào nhóm này"
                    >
                      + Thêm CS
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Lọc theo nhóm:</span>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
            >
              <option value="ALL">Tất cả các nhóm ({policies.length})</option>
              {policyGroups.map((g) => (
                <option key={g.groupName} value={g.groupName}>
                  {g.groupName} ({g.count} CS)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Lọc theo tòa:</span>
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
            >
              <option value="ALL">Tất cả các tòa</option>
              {allKnownBuildings.map((b) => (
                <option key={b} value={b}>
                  Tòa {b}
                </option>
              ))}
            </select>
          </div>

          {(filterGroup !== 'ALL' || filterBuilding !== 'ALL') && (
            <button
              onClick={() => {
                setFilterGroup('ALL')
                setFilterBuilding('ALL')
              }}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Xóa bộ lọc ✕
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị: <strong>{filteredPolicies.length}</strong> / {policies.length} chính sách
        </div>
      </div>

      {/* ── POLICIES LIST GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.map((p) => {
          const badge = STATUS_MAP[p.status] || { label: p.status, className: 'bg-slate-100' }
          const groupName = p.groupName?.trim() || 'Chính sách chung'
          const appBldgs = p.applicableBuildings?.trim() || 'ALL'
          const isAll = appBldgs === 'ALL'

          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Group & Building header tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    📁 {groupName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isAll
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    🏢 {isAll ? 'Tất cả tòa' : `Tòa: ${appBldgs}`}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{p.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}

                <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs text-slate-700 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chiết khấu %:</span>
                    <span className="font-bold text-blue-600">{p.discountPercent}%</span>
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
                      <span className="text-slate-500">Quà tặng CĐT:</span>
                      <span className="font-semibold text-purple-600">{formatVND(p.giftValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Phương thức tính:</span>
                    <span className="font-bold bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
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
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 font-medium"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>

                <div className="space-x-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-bold"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-bold"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <p className="text-base font-semibold text-slate-600">Không tìm thấy chính sách nào phù hợp với bộ lọc</p>
          <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc thêm chính sách mới vào nhóm này.</p>
        </div>
      )}

      {/* ── MODAL 1: GÁN / THÊM TÒA ÁP DỤNG CHO NHÓM (MULTI-BUILDING ASSIGNMENT) ── */}
      {isBuildingModalOpen && selectedGroupForBuildings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏢</span> Gán / Thêm Tòa Áp Dụng Cho Nhóm
                </h2>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  Nhóm: {selectedGroupForBuildings.groupName}
                </p>
              </div>
              <button
                onClick={() => setIsBuildingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể tích chọn các tòa (hoặc thêm mã tòa mới) để áp dụng toàn bộ chính sách trong nhóm này. Nếu các tòa có chính sách giống nhau, chỉ cần thêm các tòa đó vào đây.
            </p>

            {/* All Buildings Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={modalIsAllBuildings}
                onChange={(e) => setModalIsAllBuildings(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                🌟 Áp dụng cho TẤT CẢ các tòa (ALL)
              </span>
            </label>

            {/* Specific Buildings Checklist */}
            {!modalIsAllBuildings && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Chọn các tòa áp dụng:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allKnownBuildings.map((b) => {
                      const isChecked = modalBuildingChecklist.includes(b)
                      return (
                        <label
                          key={b}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setModalBuildingChecklist(modalBuildingChecklist.filter((x) => x !== b))
                              } else {
                                setModalBuildingChecklist([...modalBuildingChecklist, b])
                              }
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                          />
                          <span>Tòa {b}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thêm mã tòa khác (phân cách bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: P10, S3, T1..."
                    value={modalCustomBuilding}
                    onChange={(e) => setModalCustomBuilding(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Preview summary */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-600 block">Danh sách tòa sẽ áp dụng:</span>
                  <div className="font-bold text-blue-900 flex flex-wrap gap-1">
                    {(() => {
                      const list = [...modalBuildingChecklist]
                      if (modalCustomBuilding.trim()) {
                        modalCustomBuilding.split(',').forEach((x) => {
                          const t = x.trim().toUpperCase()
                          if (t && !list.includes(t)) list.push(t)
                        })
                      }
                      if (list.length === 0) return <span className="text-amber-700">Chưa chọn tòa nào (sẽ mặc định áp dụng tất cả)</span>
                      return list.map((b) => (
                        <span key={b} className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded font-mono">
                          {b}
                        </span>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBuildingModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveGroupBuildings}
                disabled={isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
              >
                {isPending ? 'Đang cập nhật...' : 'Lưu Tòa Áp Dụng Cho Nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TẠO NHÓM CHÍNH SÁCH MỚI ── */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>🏢</span> Tạo Nhóm Chính Sách Mới
              </h2>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên nhóm chính sách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CSBH Tòa P12 Độc Quyền, CSBH Mở Bán Tòa S1 - S2..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newGroupIsAll}
                    onChange={(e) => setNewGroupIsAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Áp dụng cho tất cả các tòa (ALL)</span>
                </label>

                {!newGroupIsAll && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Chọn tòa áp dụng cho nhóm này:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {allKnownBuildings.map((b) => {
                        const checked = newGroupBuildings.includes(b)
                        return (
                          <label
                            key={b}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer select-none ${
                              checked
                                ? 'bg-blue-50 border-blue-400 text-blue-900'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setNewGroupBuildings(newGroupBuildings.filter((x) => x !== b))
                                } else {
                                  setNewGroupBuildings([...newGroupBuildings, b])
                                }
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                            />
                            <span>{b}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateNewGroup}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
              >
                Tiếp tục tạo chính sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: TẠO / SỬA CHÍNH SÁCH BÁN HÀNG ── */}
      {isModalOpen && editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingPolicy.id ? 'Sửa chính sách bán hàng' : 'Thêm chính sách bán hàng mới'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập tỷ lệ chiết khấu và phân nhóm theo tòa nhà
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Group Name & Buildings configuration */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span>🏢</span> Phân Nhóm & Tòa Áp Dụng
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhóm chính sách <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="policy-groups-list"
                      required
                      placeholder="VD: CSBH Tòa P12 Độc Quyền"
                      value={editingPolicy.groupName || ''}
                      onChange={(e) =>
                        setEditingPolicy({ ...editingPolicy, groupName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white font-medium"
                    />
                    <datalist id="policy-groups-list">
                      {policyGroups.map((g) => (
                        <option key={g.groupName} value={g.groupName} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tòa áp dụng (&quot;ALL&quot; hoặc &quot;P12,P11&quot;)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: P12 hoặc S1,S2 hoặc ALL"
                      value={editingPolicy.applicableBuildings || 'ALL'}
                      onChange={(e) =>
                        setEditingPolicy({
                          ...editingPolicy,
                          applicableBuildings: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white font-mono font-bold text-blue-900"
                    />
                    <div className="flex gap-1.5 mt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPolicy({ ...editingPolicy, applicableBuildings: 'ALL' })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        [Tất cả tòa]
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPolicy({ ...editingPolicy, applicableBuildings: 'P12' })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        [P12]
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPolicy({ ...editingPolicy, applicableBuildings: 'S1,S2' })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        [S1,S2]
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chính sách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Early Bird (EB) - Chiết khấu 1%"
                  value={editingPolicy.name || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
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
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-bold text-blue-600"
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
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-medium"
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
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-semibold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá trị Quà tặng CĐT (VNĐ)
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
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-semibold text-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phương thức tính chiết khấu
                  </label>
                  <select
                    value={editingPolicy.discountMode || 'SEQUENTIAL'}
                    onChange={(e) =>
                      setEditingPolicy({ ...editingPolicy, discountMode: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="SEQUENTIAL">Lũy kế (SEQUENTIAL: Trừ dần từng bước)</option>
                    <option value="STACKED">Cộng dồn (STACKED: Giá gốc × Tổng %)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingPolicy.status || 'ACTIVE'}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, status: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="ACTIVE">ACTIVE (Đang áp dụng)</option>
                    <option value="DRAFT">DRAFT (Bản nháp)</option>
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
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
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
