'use client'

import React, { useState, useTransition, useEffect, useMemo } from 'react'
import {
  savePolicyFolder,
  deletePolicyFolder,
  updateFolderBuildings,
  savePolicy,
  updatePolicyStatus,
  deletePolicy,
} from '@/app/admin/actions'
import { formatVND } from '@/lib/calculations'
import {
  getStoredFolders,
  saveStoredFolders,
  getStoredPolicies,
  saveStoredPolicies,
} from '@/lib/clientStore'
import { FALLBACK_FOLDERS } from '@/lib/fallback-data'

interface PolicyFolderItem {
  id: string
  name: string
  description?: string | null
  applicableBuildings: string // "P12" or "S1,S2" or "ALL"
  status: string
  priority?: number
}

interface PolicyItem {
  id: string
  folderId?: string | null
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
  initialFolders: any[]
  availableBuildings?: string[]
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Bản nháp (DRAFT)', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  ACTIVE: { label: 'Đang áp dụng (ACTIVE)', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  EXPIRED: { label: 'Hết hạn (EXPIRED)', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  ARCHIVED: { label: 'Lưu trữ (ARCHIVED)', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
}

export default function PoliciesClient({
  initialPolicies,
  initialFolders,
  availableBuildings = ['P12', 'P11', 'S1', 'S2'],
}: Props) {
  const [isPending, startTransition] = useTransition()

  // Folders & Policies State
  const [folders, setFolders] = useState<PolicyFolderItem[]>([])
  const [policies, setPolicies] = useState<PolicyItem[]>([])

  // Modal 1: Create / Edit Folder
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Partial<PolicyFolderItem> | null>(null)
  const [folderBuildingsChecklist, setFolderBuildingsChecklist] = useState<string[]>([])
  const [folderIsAllBuildings, setFolderIsAllBuildings] = useState(false)
  const [folderCustomBuilding, setFolderCustomBuilding] = useState('')

  // Modal 2: Assign / Add Buildings to Folder
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningFolder, setAssigningFolder] = useState<PolicyFolderItem | null>(null)
  const [assignBuildingsChecklist, setAssignBuildingsChecklist] = useState<string[]>([])
  const [assignIsAll, setAssignIsAll] = useState(false)
  const [assignCustomBuilding, setAssignCustomBuilding] = useState('')

  // Modal 3: Create / Edit Policy inside Folder
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Partial<PolicyItem> | null>(null)

  // Filter
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL')

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Sync with client localStorage
  useEffect(() => {
    const fallbackF = initialFolders.length > 0 ? initialFolders : FALLBACK_FOLDERS
    const storedF = getStoredFolders(fallbackF)
    setFolders(storedF)

    const storedP = getStoredPolicies(initialPolicies)
    // Auto-link policies to folders if folderId missing
    const migratedP = storedP.map((p: any) => {
      if (!p.folderId) {
        if (p.applicableBuildings === 'P12') p.folderId = 'folder-p12'
        else if (p.applicableBuildings === 'S1,S2' || p.applicableBuildings?.includes('S1')) p.folderId = 'folder-s1-s2'
        else p.folderId = storedF[0]?.id || 'folder-p12'
      }
      return p
    })
    setPolicies(migratedP)
    saveStoredPolicies(migratedP)

    const handleFolders = (e: any) => e.detail && setFolders(e.detail)
    const handlePolicies = (e: any) => e.detail && setPolicies(e.detail)

    window.addEventListener('sun_folders_updated', handleFolders)
    window.addEventListener('sun_policies_updated', handlePolicies)

    return () => {
      window.removeEventListener('sun_folders_updated', handleFolders)
      window.removeEventListener('sun_policies_updated', handlePolicies)
    }
  }, [initialFolders, initialPolicies])

  // Collect all known building codes
  const allKnownBuildings = useMemo(() => {
    const set = new Set<string>(availableBuildings)
    folders.forEach((f) => {
      if (f.applicableBuildings && f.applicableBuildings !== 'ALL') {
        f.applicableBuildings.split(',').forEach((b) => {
          const trimmed = b.trim().toUpperCase()
          if (trimmed) set.add(trimmed)
        })
      }
    })
    return Array.from(set).sort()
  }, [folders, availableBuildings])

  // Map policies by folderId
  const policiesByFolder = useMemo(() => {
    const map = new Map<string, PolicyItem[]>()
    folders.forEach((f) => map.set(f.id, []))
    // Also a bucket for unassigned
    map.set('unassigned', [])

    policies.forEach((p) => {
      const fId = p.folderId || 'unassigned'
      if (!map.has(fId)) {
        map.set(fId, [])
      }
      map.get(fId)!.push(p)
    })
    return map
  }, [folders, policies])

  // Filtered folders
  const filteredFolders = useMemo(() => {
    if (filterBuilding === 'ALL') return folders
    return folders.filter((f) => {
      const app = (f.applicableBuildings || 'ALL').trim().toUpperCase()
      if (app === 'ALL') return true
      const list = app.split(',').map((s) => s.trim().toUpperCase())
      return list.includes(filterBuilding.toUpperCase())
    })
  }, [folders, filterBuilding])

  // ─────────────────────────────────────────────────────────────
  // FOLDER CRUD HANDLERS
  // ─────────────────────────────────────────────────────────────

  const openCreateFolderModal = () => {
    setEditingFolder({
      name: '',
      description: '',
      applicableBuildings: 'P12',
      status: 'ACTIVE',
    })
    setFolderIsAllBuildings(false)
    setFolderBuildingsChecklist(['P12'])
    setFolderCustomBuilding('')
    setIsFolderModalOpen(true)
  }

  const openEditFolderModal = (f: PolicyFolderItem) => {
    setEditingFolder({ ...f })
    const isAll = !f.applicableBuildings || f.applicableBuildings === 'ALL'
    setFolderIsAllBuildings(isAll)
    if (isAll) {
      setFolderBuildingsChecklist([])
    } else {
      setFolderBuildingsChecklist(f.applicableBuildings.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    }
    setFolderCustomBuilding('')
    setIsFolderModalOpen(true)
  }

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFolder?.name?.trim()) {
      alert('Vui lòng nhập tên thư mục')
      return
    }

    let bldgs = 'ALL'
    if (!folderIsAllBuildings) {
      const list = [...folderBuildingsChecklist]
      if (folderCustomBuilding.trim()) {
        folderCustomBuilding.split(',').forEach((x) => {
          const t = x.trim().toUpperCase()
          if (t && !list.includes(t)) list.push(t)
        })
      }
      bldgs = list.length > 0 ? list.join(',') : 'ALL'
    }

    const folderPayload: PolicyFolderItem = {
      id: editingFolder.id || 'folder-' + Date.now(),
      name: editingFolder.name.trim(),
      description: editingFolder.description?.trim() || null,
      applicableBuildings: bldgs,
      status: editingFolder.status || 'ACTIVE',
      priority: editingFolder.priority || folders.length + 1,
    }

    let updatedFolders: PolicyFolderItem[]
    if (editingFolder.id) {
      updatedFolders = folders.map((f) => (f.id === editingFolder.id ? folderPayload : f))
      // Also update applicableBuildings on child policies
      const updatedPolicies = policies.map((p) => {
        if (p.folderId === editingFolder.id) {
          return { ...p, applicableBuildings: bldgs, groupName: folderPayload.name }
        }
        return p
      })
      setPolicies(updatedPolicies)
      saveStoredPolicies(updatedPolicies)
    } else {
      updatedFolders = [...folders, folderPayload]
    }

    setFolders(updatedFolders)
    saveStoredFolders(updatedFolders)
    setIsFolderModalOpen(false)
    showToast(`Đã lưu thư mục "${folderPayload.name}" thành công!`)

    startTransition(async () => {
      try {
        await savePolicyFolder(folderPayload)
      } catch (err) {
        console.warn('Background savePolicyFolder error:', err)
      }
    })
  }

  const handleDeleteFolder = (f: PolicyFolderItem) => {
    const childCount = policiesByFolder.get(f.id)?.length || 0
    if (
      !confirm(
        `Xác nhận xóa thư mục "${f.name}"?\n${
          childCount > 0 ? `Lưu ý: Sẽ xóa đồng thời ${childCount} chính sách con bên trong thư mục này.` : ''
        }`
      )
    )
      return

    const updatedFolders = folders.filter((item) => item.id !== f.id)
    const updatedPolicies = policies.filter((p) => p.folderId !== f.id)

    setFolders(updatedFolders)
    saveStoredFolders(updatedFolders)
    setPolicies(updatedPolicies)
    saveStoredPolicies(updatedPolicies)
    showToast(`Đã xóa thư mục "${f.name}"`)

    startTransition(async () => {
      try {
        await deletePolicyFolder(f.id)
      } catch (err) {
        console.warn('Background deletePolicyFolder error:', err)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────
  // ASSIGN BUILDINGS TO FOLDER
  // ─────────────────────────────────────────────────────────────

  const openAssignModal = (f: PolicyFolderItem) => {
    setAssigningFolder(f)
    const isAll = !f.applicableBuildings || f.applicableBuildings === 'ALL'
    setAssignIsAll(isAll)
    if (isAll) {
      setAssignBuildingsChecklist([])
    } else {
      setAssignBuildingsChecklist(f.applicableBuildings.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    }
    setAssignCustomBuilding('')
    setIsAssignModalOpen(true)
  }

  const handleSaveAssignBuildings = async () => {
    if (!assigningFolder) return
    let bldgs = 'ALL'
    if (!assignIsAll) {
      const list = [...assignBuildingsChecklist]
      if (assignCustomBuilding.trim()) {
        assignCustomBuilding.split(',').forEach((x) => {
          const t = x.trim().toUpperCase()
          if (t && !list.includes(t)) list.push(t)
        })
      }
      bldgs = list.length > 0 ? list.join(',') : 'ALL'
    }

    const updatedFolders = folders.map((f) =>
      f.id === assigningFolder.id ? { ...f, applicableBuildings: bldgs } : f
    )
    const updatedPolicies = policies.map((p) =>
      p.folderId === assigningFolder.id ? { ...p, applicableBuildings: bldgs } : p
    )

    setFolders(updatedFolders)
    saveStoredFolders(updatedFolders)
    setPolicies(updatedPolicies)
    saveStoredPolicies(updatedPolicies)
    setIsAssignModalOpen(false)
    showToast(`Đã gán tòa cho thư mục "${assigningFolder.name}": ${bldgs}`)

    startTransition(async () => {
      try {
        await updateFolderBuildings(assigningFolder.id, bldgs)
      } catch (err) {
        console.warn('Background updateFolderBuildings error:', err)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────
  // POLICY CRUD INSIDE FOLDER
  // ─────────────────────────────────────────────────────────────

  const openCreatePolicyInFolder = (folderId: string) => {
    const parentFolder = folders.find((f) => f.id === folderId)
    setEditingPolicy({
      folderId,
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
      groupName: parentFolder?.name || 'Chính sách chung',
      applicableBuildings: parentFolder?.applicableBuildings || 'ALL',
    })
    setIsPolicyModalOpen(true)
  }

  const openEditPolicyModal = (p: PolicyItem) => {
    setEditingPolicy({ ...p })
    setIsPolicyModalOpen(true)
  }

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPolicy?.name?.trim()) {
      alert('Vui lòng nhập tên chính sách')
      return
    }

    const parentFolder = folders.find((f) => f.id === editingPolicy.folderId)
    const policyPayload = {
      ...editingPolicy,
      id: editingPolicy.id || 'policy-' + Date.now(),
      folderId: editingPolicy.folderId || folders[0]?.id || 'folder-p12',
      groupName: parentFolder?.name || editingPolicy.groupName || 'Chính sách chung',
      applicableBuildings: parentFolder?.applicableBuildings || editingPolicy.applicableBuildings || 'ALL',
    }

    let updatedPolicies: PolicyItem[]
    if (editingPolicy.id) {
      updatedPolicies = policies.map((p) => (p.id === editingPolicy.id ? (policyPayload as any) : p))
    } else {
      updatedPolicies = [policyPayload as any, ...policies]
    }

    setPolicies(updatedPolicies)
    saveStoredPolicies(updatedPolicies)
    setIsPolicyModalOpen(false)
    showToast(`Đã lưu chính sách "${policyPayload.name}" vào thư mục!`)

    startTransition(async () => {
      try {
        await savePolicy(policyPayload)
      } catch (err) {
        console.warn('Background savePolicy error:', err)
      }
    })
  }

  const handlePolicyStatusChange = async (id: string, newStatus: string) => {
    const updated = policies.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    setPolicies(updated)
    saveStoredPolicies(updated)

    startTransition(async () => {
      try {
        await updatePolicyStatus(id, newStatus)
      } catch (err) {
        console.warn('Background updatePolicyStatus error:', err)
      }
    })
  }

  const handleDeletePolicy = (id: string, name: string) => {
    if (!confirm(`Xóa chính sách "${name}"?`)) return
    const updated = policies.filter((p) => p.id !== id)
    setPolicies(updated)
    saveStoredPolicies(updated)
    showToast(`Đã xóa chính sách "${name}"`)

    startTransition(async () => {
      try {
        await deletePolicy(id)
      } catch (err) {
        console.warn('Background deletePolicy error:', err)
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
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl text-xl">📁</span>
            Quản Lý Thư Mục Chính Sách Bán Hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mỗi thư mục chứa các chính sách chiết khấu riêng biệt và được <strong>gán cho một hoặc nhiều tòa nhà</strong>.
          </p>
        </div>
        <button
          onClick={openCreateFolderModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-sm shadow-blue-500/20"
        >
          📁 + Tạo Thư Mục Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-bold text-slate-700">Lọc thư mục theo tòa:</span>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
          >
            <option value="ALL">Tất cả các tòa</option>
            {allKnownBuildings.map((b) => (
              <option key={b} value={b}>
                Tòa {b}
              </option>
            ))}
          </select>
          {filterBuilding !== 'ALL' && (
            <button
              onClick={() => setFilterBuilding('ALL')}
              className="text-xs text-rose-600 hover:underline font-semibold ml-2"
            >
              Xóa lọc ✕
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong>{folders.length}</strong> thư mục • <strong>{policies.length}</strong> chính sách
        </div>
      </div>

      {/* ── FOLDERS LIST CONTAINER ── */}
      <div className="space-y-6">
        {filteredFolders.map((folder) => {
          const isAll = !folder.applicableBuildings || folder.applicableBuildings === 'ALL'
          const bldgList = isAll
            ? ['Tất cả các tòa']
            : folder.applicableBuildings.split(',').map((s) => s.trim().toUpperCase())
          const folderPolicies = policiesByFolder.get(folder.id) || []

          return (
            <div
              key={folder.id}
              className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-blue-300"
            >
              {/* ── FOLDER HEADER ── */}
              <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📁</span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {folder.name}
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {folderPolicies.length} chính sách
                        </span>
                      </h2>
                      {folder.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{folder.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Assigned Buildings Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      🏢 <strong>Tòa nhà được gán:</strong>
                    </span>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {bldgList.map((b, i) => (
                        <span
                          key={i}
                          className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            isAll
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          }`}
                        >
                          {isAll ? '🌟 Tất cả các tòa (ALL)' : `Tòa ${b}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Folder Header Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openCreatePolicyInFolder(folder.id)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    title="Thêm chính sách con trực tiếp vào thư mục này"
                  >
                    + Thêm chính sách vào thư mục này
                  </button>

                  <button
                    onClick={() => openAssignModal(folder)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition"
                    title="Gán thêm tòa nhà hoặc sửa đổi các tòa áp dụng thư mục này"
                  >
                    🏢 Gán / Thêm Tòa
                  </button>

                  <button
                    onClick={() => openEditFolderModal(folder)}
                    className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold transition"
                    title="Đổi tên hoặc mô tả thư mục"
                  >
                    ✏️ Sửa thư mục
                  </button>

                  <button
                    onClick={() => handleDeleteFolder(folder)}
                    className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition"
                    title="Xóa thư mục"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>

              {/* ── FOLDER BODY (POLICIES LIST INSIDE THIS FOLDER) ── */}
              <div className="p-5">
                {folderPolicies.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 space-y-2">
                    <p className="text-sm font-semibold text-slate-600">
                      Thư mục này hiện chưa có chính sách bán hàng nào.
                    </p>
                    <p className="text-xs text-slate-400">
                      Hãy bấm nút bên dưới để thêm các chính sách chiết khấu dành riêng cho các tòa đã gán ({bldgList.join(', ')}).
                    </p>
                    <button
                      onClick={() => openCreatePolicyInFolder(folder.id)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      + Thêm chính sách đầu tiên vào thư mục
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folderPolicies.map((p) => {
                      const badge = STATUS_MAP[p.status] || {
                        label: p.status,
                        className: 'bg-slate-100',
                      }
                      return (
                        <div
                          key={p.id}
                          className="bg-slate-50/60 rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:bg-white hover:border-blue-300 transition-all shadow-xs"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                {p.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            {p.description && (
                              <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                                {p.description}
                              </p>
                            )}

                            {/* Discount details */}
                            <div className="bg-white rounded-lg p-2.5 space-y-1.5 text-xs text-slate-700 mb-3 border border-slate-200/80">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Chiết khấu %:</span>
                                <span className="font-bold text-blue-600">
                                  {p.discountPercent}%
                                </span>
                              </div>
                              {p.fixedDiscount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">CK cố định:</span>
                                  <span className="font-semibold">{formatVND(p.fixedDiscount)}</span>
                                </div>
                              )}
                              {p.earlyPaymentDiscountPct > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">CK Thanh toán sớm:</span>
                                  <span className="font-semibold text-emerald-600">
                                    {p.earlyPaymentDiscountPct}%
                                  </span>
                                </div>
                              )}
                              {p.giftValue > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Quà tặng:</span>
                                  <span className="font-semibold text-purple-600">
                                    {formatVND(p.giftValue)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px]">
                                <span className="text-slate-500">Phương thức tính:</span>
                                <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  {p.discountMode === 'SEQUENTIAL' ? 'Lũy kế' : 'Cộng dồn'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                            <select
                              value={p.status}
                              onChange={(e) => handlePolicyStatusChange(p.id, e.target.value)}
                              className="text-[11px] border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 font-medium"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="DRAFT">DRAFT</option>
                              <option value="EXPIRED">EXPIRED</option>
                              <option value="ARCHIVED">ARCHIVED</option>
                            </select>

                            <div className="space-x-1">
                              <button
                                onClick={() => openEditPolicyModal(p)}
                                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-bold"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeletePolicy(p.id, p.name)}
                                className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-bold"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredFolders.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-600">
              Không tìm thấy thư mục nào phù hợp với bộ lọc
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Hãy thử xóa bộ lọc hoặc bấm nút &quot;📁 + Tạo Thư Mục Mới&quot; ở trên.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL 1: TẠO / SỬA THƯ MỤC CHÍNH SÁCH ── */}
      {isFolderModalOpen && editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📁</span> {editingFolder.id ? 'Sửa Thư Mục Chính Sách' : 'Tạo Thư Mục Chính Sách Mới'}
              </h2>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên thư mục chính sách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CSBH Tòa P12 - Quỹ Độc Quyền, CSBH Mở Bán Tòa S1 - S2..."
                  value={editingFolder.name || ''}
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả thư mục (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Áp dụng cho các căn hộ đợt 1 mở bán..."
                  value={editingFolder.description || ''}
                  onChange={(e) => setEditingFolder({ ...editingFolder, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              {/* Buildings assignment section inside folder */}
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2.5">
                <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider">
                  🏢 Gán các tòa nhà cho thư mục này
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={folderIsAllBuildings}
                    onChange={(e) => setFolderIsAllBuildings(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Áp dụng cho tất cả các tòa (ALL)</span>
                </label>

                {!folderIsAllBuildings && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Tích chọn tòa áp dụng:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allKnownBuildings.map((b) => {
                        const isChecked = folderBuildingsChecklist.includes(b)
                        return (
                          <label
                            key={b}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer select-none ${
                              isChecked
                                ? 'bg-blue-100 border-blue-400 text-blue-950'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setFolderBuildingsChecklist(
                                    folderBuildingsChecklist.filter((x) => x !== b)
                                  )
                                } else {
                                  setFolderBuildingsChecklist([...folderBuildingsChecklist, b])
                                }
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                            />
                            <span>Tòa {b}</span>
                          </label>
                        )
                      })}
                    </div>

                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Thêm mã tòa khác (phân cách bằng dấu phẩy):
                      </label>
                      <input
                        type="text"
                        placeholder="VD: P10, S3..."
                        value={folderCustomBuilding}
                        onChange={(e) => setFolderCustomBuilding(e.target.value)}
                        className="w-full px-3 py-1 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu Thư Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GÁN / THÊM TÒA CHO THƯ MỤC ── */}
      {isAssignModalOpen && assigningFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🏢</span> Gán / Thêm Tòa Cho Thư Mục
                </h2>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  Thư mục: {assigningFolder.name}
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể gán thêm tòa (VD: thêm `P11`, `S2`...) vào thư mục này nếu các tòa này có cùng chính sách bán hàng. Khi lưu, toàn bộ chính sách trong thư mục sẽ tự động áp dụng cho các tòa đã chọn.
            </p>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={assignIsAll}
                onChange={(e) => setAssignIsAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                🌟 Áp dụng cho TẤT CẢ các tòa (ALL)
              </span>
            </label>

            {!assignIsAll && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Chọn các tòa áp dụng thư mục này:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allKnownBuildings.map((b) => {
                      const isChecked = assignBuildingsChecklist.includes(b)
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
                                setAssignBuildingsChecklist(
                                  assignBuildingsChecklist.filter((x) => x !== b)
                                )
                              } else {
                                setAssignBuildingsChecklist([...assignBuildingsChecklist, b])
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
                    placeholder="VD: P10, S3..."
                    value={assignCustomBuilding}
                    onChange={(e) => setAssignCustomBuilding(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-600 block">Danh sách tòa sẽ áp dụng:</span>
                  <div className="font-bold text-blue-900 flex flex-wrap gap-1">
                    {(() => {
                      const list = [...assignBuildingsChecklist]
                      if (assignCustomBuilding.trim()) {
                        assignCustomBuilding.split(',').forEach((x) => {
                          const t = x.trim().toUpperCase()
                          if (t && !list.includes(t)) list.push(t)
                        })
                      }
                      if (list.length === 0)
                        return (
                          <span className="text-amber-700">Chưa chọn tòa nào (mặc định ALL)</span>
                        )
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
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAssignBuildings}
                disabled={isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
              >
                {isPending ? 'Đang lưu...' : 'Lưu Tòa Áp Dụng Cho Thư Mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: TẠO / SỬA CHÍNH SÁCH CON TRONG THƯ MỤC ── */}
      {isPolicyModalOpen && editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingPolicy.id ? 'Sửa chính sách bán hàng' : 'Thêm chính sách vào thư mục'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chính sách con thuộc thư mục sẽ áp dụng cho tất cả các tòa được gán cho thư mục đó
                </p>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="mt-4 space-y-4">
              {/* Folder Selector */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  Thuộc Thư Mục Chính Sách <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingPolicy.folderId || folders[0]?.id || ''}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, folderId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} (Gán cho: {f.applicableBuildings === 'ALL' ? 'Tất cả tòa' : `Tòa ${f.applicableBuildings}`})
                    </option>
                  ))}
                </select>
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
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu chính sách vào thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
