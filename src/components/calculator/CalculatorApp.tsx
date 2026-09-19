'use client'

import React, { useState, useMemo, useRef, useTransition, useEffect } from 'react'
import {
  calculatePrice,
  calculateMultiPolicyPrice,
  calculatePaymentSchedule,
  calculateLoan,
  calculateLoanEquity,
  calculateInitialCashRequired,
  formatVND,
  formatArea,
  formatPricePerM2,
  buildQuoteSnapshot,
} from '@/lib/calculations'
import { saveQuote } from '@/app/actions'
import { QuotePreview } from './QuotePreview'
import {
  getStoredUnits,
  getStoredPolicies,
  getStoredPaymentPlans,
  getStoredLoanPrograms,
} from '@/lib/clientStore'
import {
  Building,
  ArrowRight,
  Calculator,
  ShieldCheck,
  Download,
  FileText,
  CheckCircle2,
  ExternalLink,
  Share2,
} from 'lucide-react'

type Props = {
  units: any[]
  policies: any[]
  paymentPlans: any[]
  loanPrograms?: any[]
}

export function CalculatorApp({ units, policies, paymentPlans, loanPrograms = [] }: Props) {
  // Client-persisted lists that survive serverless refreshes
  const [unitsList, setUnitsList] = useState<any[]>(units)
  const [policiesList, setPoliciesList] = useState<any[]>(policies)
  const [plansList, setPlansList] = useState<any[]>(paymentPlans)
  const [loansList, setLoansList] = useState<any[]>(loanPrograms)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '')
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>(
    policies[0]?.id ? [policies[0].id] : []
  )
  const [discountCalculationMode, setDiscountCalculationMode] = useState<'STACKED' | 'SEQUENTIAL'>('SEQUENTIAL')
  const [selectedPlanId, setSelectedPlanId] = useState<string>(paymentPlans[0]?.id || '')
  const [selectedLoanProgramId, setSelectedLoanProgramId] = useState<string>(
    loanPrograms[0]?.id || ''
  )

  // Loan parameters
  const [loanPercent, setLoanPercent] = useState<number>(70)
  const [interestRate, setInterestRate] = useState<number>(
    loanPrograms[0]?.annualInterestRate || 8.5
  )
  const [loanTermMonths, setLoanTermMonths] = useState<number>(
    loanPrograms[0]?.maxLoanTermMonths || 240
  )
  const [repaymentMethod, setRepaymentMethod] = useState<'EQUAL_PAYMENT' | 'EQUAL_PRINCIPAL'>(
    (loanPrograms[0]?.repaymentMethod as any) || 'EQUAL_PAYMENT'
  )

  // Customer & Sales inputs
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [salesName, setSalesName] = useState('')
  const [salesPhone, setSalesPhone] = useState('')

  // Quote snapshot state
  const [isPending, startTransition] = useTransition()
  const [createdQuoteId, setCreatedQuoteId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const quoteRef = useRef<HTMLDivElement>(null)

  // Sync with client storage on mount & listen to changes
  useEffect(() => {
    const storedU = getStoredUnits(units)
    setUnitsList(storedU)
    if (storedU.length > 0 && !storedU.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(storedU[0].id)
    }

    const storedP = getStoredPolicies(policies)
    setPoliciesList(storedP)

    const storedPl = getStoredPaymentPlans(paymentPlans)
    setPlansList(storedPl)

    const storedL = getStoredLoanPrograms(loanPrograms)
    setLoansList(storedL)

    const handleUnits = (e: any) => {
      if (e.detail) {
        setUnitsList(e.detail)
        if (e.detail.length > 0 && !e.detail.some((u: any) => u.id === selectedUnitId)) {
          setSelectedUnitId(e.detail[0].id)
        }
      }
    }
    const handlePolicies = (e: any) => e.detail && setPoliciesList(e.detail)
    const handlePlans = (e: any) => e.detail && setPlansList(e.detail)
    const handleLoans = (e: any) => e.detail && setLoansList(e.detail)

    window.addEventListener('sun_units_updated', handleUnits)
    window.addEventListener('sun_policies_updated', handlePolicies)
    window.addEventListener('sun_plans_updated', handlePlans)
    window.addEventListener('sun_loans_updated', handleLoans)

    return () => {
      window.removeEventListener('sun_units_updated', handleUnits)
      window.removeEventListener('sun_policies_updated', handlePolicies)
      window.removeEventListener('sun_plans_updated', handlePlans)
      window.removeEventListener('sun_loans_updated', handleLoans)
    }
  }, [units, policies, paymentPlans, loanPrograms])

  // Update loan params when loan program changes
  const handleSelectLoanProgram = (progId: string) => {
    setSelectedLoanProgramId(progId)
    const prog = loansList.find((p) => p.id === progId)
    if (prog) {
      setInterestRate(prog.annualInterestRate)
      setLoanTermMonths(prog.maxLoanTermMonths)
      setLoanPercent(prog.maxLoanPercent)
      if (prog.repaymentMethod) setRepaymentMethod(prog.repaymentMethod as any)
    }
  }

  // Selected Entities
  const selectedUnit = useMemo(
    () => unitsList.find((u) => u.id === selectedUnitId) || unitsList[0] || null,
    [unitsList, selectedUnitId]
  )
  const selectedPolicies = useMemo(
    () => policiesList.filter((p) => selectedPolicyIds.includes(p.id)),
    [policiesList, selectedPolicyIds]
  )
  const selectedPolicy = selectedPolicies[0] || null

  const togglePolicy = (id: string) => {
    setSelectedPolicyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }
  const selectAllPolicies = () => {
    setSelectedPolicyIds(policiesList.map((p) => p.id))
  }
  const clearAllPolicies = () => {
    setSelectedPolicyIds([])
  }

  const selectedPlan = useMemo(
    () => plansList.find((p) => p.id === selectedPlanId) || null,
    [plansList, selectedPlanId]
  )
  const selectedLoanProgram = useMemo(
    () => loansList.find((p) => p.id === selectedLoanProgramId) || null,
    [loansList, selectedLoanProgramId]
  )

  // 1. PRICE CALCULATION (Deterministic Multi-Policy Engine)
  const priceResult = useMemo(() => {
    if (!selectedUnit) {
      return {
        basePrice: 0,
        percentageDiscountAmount: 0,
        fixedDiscountAmount: 0,
        earlyPaymentDiscountAmount: 0,
        specialDiscountAmount: 0,
        totalDiscount: 0,
        finalPrice: 0,
        originalPricePerM2: 0,
        finalPricePerM2: 0,
        discountCalculationMode,
        discountBreakdown: [],
      }
    }

    return calculateMultiPolicyPrice({
      basePrice: selectedUnit.basePrice,
      area: selectedUnit.area,
      policies: selectedPolicies,
      discountCalculationMode,
    })
  }, [selectedUnit, selectedPolicies, discountCalculationMode])

  // 2. PAYMENT SCHEDULE CALCULATION
  const paymentScheduleResult = useMemo(() => {
    if (!selectedPlan || priceResult.finalPrice <= 0) return null
    const items =
      selectedPlan.scheduleItems ||
      selectedPlan.schedules?.map((s: any) => ({
        name: s.stepName || s.name,
        percentage: s.percentValue || s.percentage,
        dueDateNote: s.timePoint || s.dueDateNote,
      })) ||
      []

    return calculatePaymentSchedule(priceResult.finalPrice, items)
  }, [selectedPlan, priceResult.finalPrice])

  // 3. LOAN CALCULATION
  const { loanAmount, equityAmount } = useMemo(() => {
    return calculateLoanEquity(priceResult.finalPrice, loanPercent)
  }, [priceResult.finalPrice, loanPercent])

  const loanResult = useMemo(() => {
    if (selectedPlan?.type !== 'LOAN' || loanAmount <= 0) return null

    return calculateLoan({
      principal: loanAmount,
      annualInterestRate: interestRate,
      loanTermMonths,
      repaymentMethod,
      supportPeriodMonths: selectedLoanProgram?.supportPeriodMonths,
      supportRate: selectedLoanProgram?.supportRate,
    })
  }, [selectedPlan, loanAmount, interestRate, loanTermMonths, repaymentMethod, selectedLoanProgram])

  // 4. CASHFLOW CALCULATION
  const cashflowResult = useMemo(() => {
    if (priceResult.finalPrice <= 0) return null

    const preDisburse =
      paymentScheduleResult?.installments
        .slice(0, 2)
        .map((i) => ({ name: i.name, amount: i.amount })) || []

    return calculateInitialCashRequired({
      finalPrice: priceResult.finalPrice,
      equityAmount,
      preDisbursePayments: preDisburse,
      supports: selectedPolicy?.giftValue
        ? [{ name: 'Quà tặng CĐT', amount: selectedPolicy.giftValue }]
        : [],
    })
  }, [priceResult.finalPrice, equityAmount, paymentScheduleResult, selectedPolicy])

  // 5. SAVE IMMUTABLE QUOTE SNAPSHOT
  const handleSaveQuote = async () => {
    if (!selectedUnit) {
      alert('Vui lòng chọn căn hộ')
      return
    }

    startTransition(async () => {
      const payload = buildQuoteSnapshot({
        unit: {
          id: selectedUnit.id,
          unitCode: selectedUnit.unitCode,
          buildingCode: selectedUnit.buildingCode || selectedUnit.building,
          floorNumber: selectedUnit.floorNumber || selectedUnit.floor,
          unitTypeName: selectedUnit.unitTypeName || selectedUnit.unitType,
          area: selectedUnit.area,
          direction: selectedUnit.direction,
          view: selectedUnit.view,
          basePrice: selectedUnit.basePrice,
          pricePerM2: selectedUnit.pricePerM2,
          status: selectedUnit.status,
          imageUrl: selectedUnit.imageUrl,
        },
        policy: selectedPolicies[0] || null,
        policies: selectedPolicies,
        paymentPlan: selectedPlan,
        priceResult,
        paymentScheduleResult,
        loanResult,
        customer: {
          name: customerName || 'Quý khách hàng',
          phone: customerPhone,
          email: customerEmail,
        },
        sales: {
          name: salesName || 'Chuyên viên Sun Group',
          phone: salesPhone,
        },
      })

      const res = await saveQuote(payload)
      if (res.id) {
        setCreatedQuoteId(res.id)
      } else {
        alert('Có lỗi khi lưu báo giá')
      }
    })
  }

  // 6. EXPORT PDF & PRINT ACTIONS
  const handleExportPDF = async () => {
    if (!selectedUnit) return
    // If preview modal is not open, open it first so element is fully mounted and styled
    if (!isPreviewModalOpen) {
      setIsPreviewModalOpen(true)
      await new Promise((r) => setTimeout(r, 400))
    }
    if (!quoteRef.current) return
    setIsExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = quoteRef.current
      const opt: any = {
        margin: [6, 6, 6, 6],
        filename: `Bao_Gia_Sun_Urban_${selectedUnit.unitCode}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error)
      alert('Đã xảy ra lỗi khi tạo PDF. Bạn có thể nhấn "In Phiếu / Lưu PDF (Vector Chuẩn)" để lưu file PDF sắc nét trực tiếp từ trình duyệt.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const glassCard =
    'bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all duration-300'

  return (
    <div className="space-y-8 pb-16">
      {/* ── KPI OVERVIEW DASHBOARD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${glassCard} p-5 relative overflow-hidden`}>
          <div className="absolute top-2 right-2 text-slate-200">
            <Building size={40} />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Giá niêm yết (Gốc)
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">
            {formatVND(priceResult.basePrice)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Đơn giá: {formatPricePerM2(priceResult.originalPricePerM2)}
          </p>
        </div>

        <div className={`${glassCard} p-5 relative overflow-hidden`}>
          <div className="absolute top-2 right-2 text-emerald-100">
            <ArrowRight size={40} />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Tổng chiết khấu
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-emerald-600">
            -{formatVND(priceResult.totalDiscount)}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Chế độ: {priceResult.discountCalculationMode}
          </p>
        </div>

        <div className={`${glassCard} p-5 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 text-white shadow-blue-900/20`}>
          <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-1">
            Giá bán sau chiết khấu
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-white">
            {formatVND(priceResult.finalPrice)}
          </p>
          <p className="text-xs text-blue-200 mt-1">Giá tính hợp đồng mua bán</p>
        </div>

        <div className={`${glassCard} p-5 relative overflow-hidden`}>
          <div className="absolute top-2 right-2 text-slate-200">
            <Calculator size={40} />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Đơn giá thông thủy thực tế
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">
            {formatPricePerM2(priceResult.finalPricePerM2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Diện tích: {selectedUnit ? formatArea(selectedUnit.area) : '—'}
          </p>
        </div>
      </div>

      {/* ── NOTIFICATION WHEN QUOTE SNAPSHOT SAVED ── */}
      {createdQuoteId && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <div className="font-bold text-sm text-emerald-900">
                Đã tạo và lưu Snapshot báo giá thành công!
              </div>
              <div className="text-xs text-emerald-700">
                Mã phiếu: <strong>{createdQuoteId}</strong> • Dữ liệu giá được cố định bất biến.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/quote/${createdQuoteId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Mở phiếu báo giá <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* ── OFFICIAL DEPOSIT ALERT BANNER ── */}
      <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="p-2.5 bg-amber-100 text-amber-800 rounded-xl text-xl font-bold flex items-center justify-center">🏛️</span>
          <div>
            <div className="font-bold text-sm text-slate-900 flex flex-wrap items-center gap-2">
              <span>Thông tin nhận cọc:</span>
              <span className="text-blue-900 font-black font-mono text-base tracking-wide">19133023958016</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-white border border-amber-300 rounded-full text-amber-900 shadow-xs">
                Techcombank - CN Hà Thành
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Đơn vị thụ hưởng: <strong className="text-slate-800">Công ty cổ phần đầu tư và thương mại Vhomes</strong>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-700 bg-white/90 px-3.5 py-2 rounded-xl border border-amber-200">
          <div className="font-bold text-slate-800 mb-0.5">Định mức nộp cọc:</div>
          <div className="flex items-center gap-2 text-[11px]">
            <span>Studio: <strong className="text-rose-600 font-bold">50tr</strong></span>
            <span>•</span>
            <span>1BR+1: <strong className="text-rose-600 font-bold">100tr</strong></span>
            <span>•</span>
            <span>2BR: <strong className="text-rose-600 font-bold">150tr</strong></span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONFIGURATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: Selection controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Căn hộ */}
          <div className={`${glassCard} p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  1
                </span>
                Chọn Căn Hộ
              </h2>
              {selectedUnit?.imageUrl && (
                <a
                  href={selectedUnit.imageUrl}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  🖼️ Xem mặt bằng căn
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mã căn hộ ({unitsList.length} căn khả dụng)
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitCode} — Tòa {u.buildingCode || u.building} (Tầng {u.floorNumber || u.floor}) - {u.unitTypeName || u.unitType} - {formatVND(u.basePrice)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUnit && (
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600 border border-slate-100">
                  <div className="flex justify-between">
                    <span>Loại căn:</span>
                    <strong className="text-slate-800">
                      {selectedUnit.unitTypeName || selectedUnit.unitType}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Diện tích:</span>
                    <strong className="text-slate-800">{formatArea(selectedUnit.area)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hướng & View:</span>
                    <strong className="text-slate-800">
                      {selectedUnit.direction || '—'} • {selectedUnit.view || '—'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Mức cọc quy định:</span>
                    <strong className="text-rose-700 font-bold">
                      {(() => {
                        const t = (selectedUnit.unitTypeName || selectedUnit.unitType || '').toUpperCase()
                        if (t.includes('STUDIO')) return '50.000.000 VNĐ'
                        if (t.includes('2BR') || t.includes('2PN')) return '150.000.000 VNĐ'
                        return '100.000.000 VNĐ'
                      })()}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Chính sách & Chiết khấu (Hỗ trợ chọn nhiều chính sách) */}
          <div className={`${glassCard} p-6 space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    2
                  </span>
                  Chính Sách Bán Hàng & Chiết Khấu
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tích chọn một hoặc nhiều chính sách ưu đãi áp dụng đồng thời
                </p>
              </div>

              {/* Mode Toggle & Select All Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDiscountCalculationMode('STACKED')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      discountCalculationMode === 'STACKED'
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tính tất cả % chiết khấu trên Giá gốc ban đầu"
                  >
                    Cộng dồn (Stacked)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountCalculationMode('SEQUENTIAL')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      discountCalculationMode === 'SEQUENTIAL'
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Chiết khấu tiếp theo tính trên giá còn lại sau chiết khấu trước"
                  >
                    Lũy kế (Sequential)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={selectAllPolicies}
                  className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 font-semibold rounded-lg border border-blue-200 transition"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={clearAllPolicies}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 font-medium rounded-lg border border-slate-200 transition"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Interactive Policy Multi-Choice Grid */}
            {policiesList.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center border border-dashed rounded-xl">
                Chưa có chính sách nào. Bạn có thể thêm trong trang Quản trị Admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {policiesList.map((p) => {
                  const isSelected = selectedPolicyIds.includes(p.id)
                  const hasPct = (p.discountPercent || 0) > 0
                  const hasEarly = (p.earlyPaymentDiscountPct || p.earlyPaymentDiscount || 0) > 0
                  const hasGift = (p.giftValue || p.specialDiscount || 0) > 0
                  const hasFixed = (p.fixedDiscount || 0) > 0

                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePolicy(p.id)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 select-none ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-400 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // click handled by parent container
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {p.name}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {hasPct && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              CK: {p.discountPercent}%
                            </span>
                          )}
                          {hasEarly && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              TTS: {p.earlyPaymentDiscountPct || p.earlyPaymentDiscount}%
                            </span>
                          )}
                          {hasGift && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Quà: {formatVND(p.giftValue || p.specialDiscount)}
                            </span>
                          )}
                          {hasFixed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              Giảm: {formatVND(p.fixedDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Active Discounts Breakdown Bar */}
            {priceResult.discountBreakdown.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 pb-1.5 border-b border-slate-200 flex justify-between items-center">
                  <span>Chi tiết các khoản chiết khấu đang áp dụng ({priceResult.discountBreakdown.length}):</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">
                    {discountCalculationMode === 'SEQUENTIAL' ? 'Lũy kế từng phần' : 'Cộng dồn (Stacked)'}
                  </span>
                </div>
                {priceResult.discountBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-700 pl-2">
                    <span>• {item.label}:</span>
                    <strong className="text-emerald-700">-{formatVND(item.amount)}</strong>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-slate-900 text-sm">
                  <span>TỔNG CHIẾT KHẤU ĐƯỢC HƯỞNG:</span>
                  <span className="text-emerald-700 text-base font-black">-{formatVND(priceResult.totalDiscount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Phương án thanh toán */}
          <div className={`${glassCard} p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  3
                </span>
                Phương Án Thanh Toán
              </h2>
              {selectedPlan && (
                <span className="text-xs px-2.5 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded-full">
                  {selectedPlan.type}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Lựa chọn phương án
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {plansList.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Installments Breakdown */}
            {paymentScheduleResult && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Đợt</th>
                      <th className="p-2.5 text-right">Tỷ lệ</th>
                      <th className="p-2.5 text-right">Số tiền (VNĐ)</th>
                      <th className="p-2.5">Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentScheduleResult.installments.map((inst, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-800">{inst.name}</td>
                        <td className="p-2.5 text-right font-medium text-blue-600">
                          {inst.percentage}%
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {formatVND(inst.amount)}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {inst.dueDateNote || 'Theo thông báo'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Tính toán Vay Ngân Hàng (Nếu chọn phương án vay) */}
          {selectedPlan?.type === 'LOAN' && (
            <div className={`${glassCard} p-6 space-y-4`}>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  4
                </span>
                Thông Số Vay Ngân Hàng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Gói vay đối tác
                  </label>
                  <select
                    value={selectedLoanProgramId}
                    onChange={(e) => handleSelectLoanProgram(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                  >
                    {loansList.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.name} ({lp.annualInterestRate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tỷ lệ vay (%)
                  </label>
                  <input
                    type="number"
                    value={loanPercent}
                    onChange={(e) => setLoanPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Lãi suất tham chiếu (%/năm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {loanResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-500 block">Số tiền vay:</span>
                    <span className="font-bold text-slate-900 text-sm">{formatVND(loanAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vốn tự có:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatVND(equityAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Thời hạn:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {loanTermMonths / 12} năm
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gốc + lãi tháng:</span>
                    <span className="font-bold text-blue-700 text-sm">
                      {formatVND(loanResult.monthlyPayment)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT 1 COL: Customer info, Save Snapshot & Actions */}
        <div className="space-y-6">
          {/* Customer & Sales Form */}
          <div className={`${glassCard} p-6 space-y-4`}>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Thông Tin Khách Hàng & Tư Vấn
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Họ tên Khách hàng</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="09xx..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="mail@..."
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Chuyên viên Tư vấn (Sales)
                </label>
                <input
                  type="text"
                  placeholder="VD: Trần Quyết - Phòng KD 1"
                  value={salesName}
                  onChange={(e) => setSalesName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">SĐT Chuyên viên</label>
                <input
                  type="text"
                  placeholder="09xx..."
                  value={salesPhone}
                  onChange={(e) => setSalesPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                disabled={!selectedUnit}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                👁️ Xem & In Phiếu Báo Giá (Bản Đầy Đủ)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting || !selectedUnit}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={14} />
                  {isExporting ? 'Đang tạo...' : 'Tải File PDF'}
                </button>

                <button
                  onClick={handleSaveQuote}
                  disabled={isPending || !selectedUnit}
                  className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  💾 Lưu Snapshot
                </button>
              </div>

              {createdQuoteId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1">
                    ✓ Đã lưu snapshot báo giá thành công!
                  </div>
                  <a
                    href={`/quote/${createdQuoteId}`}
                    target="_blank"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Xem phiếu báo giá snapshot trực tuyến →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Cashflow Summary Card */}
          {cashflowResult && (
            <div className={`${glassCard} p-6 space-y-3`}>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Vốn Ban Đầu Cần Chuẩn Bị
              </h3>
              <div className="space-y-2 text-xs">
                {cashflowResult.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>{item.label}:</span>
                    <span className="font-semibold text-slate-900">{formatVND(item.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-blue-900">
                  <span>Thực tế cần có:</span>
                  <span className="text-base text-blue-600">
                    {formatVND(cashflowResult.netCashRequired)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QUOTATION PREVIEW & PRINT MODAL ── */}
      {isPreviewModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden print:m-0 print:shadow-none print:w-full print:max-w-none">
            {/* Modal Toolbar (hidden when printing) */}
            <div className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-slate-900 text-white gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-blue-400">Phiếu Báo Giá:</span>
                <span className="font-mono font-bold text-sm bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                  {selectedUnit.unitCode}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  🖨️ In Phiếu / Lưu PDF (Vector Chuẩn)
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Download size={13} />
                  {isExporting ? 'Đang tải...' : 'Tải File PDF (.pdf)'}
                </button>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 md:p-8 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible flex justify-center bg-slate-100 print:bg-white print:p-0">
              <div className="shadow-lg print:shadow-none bg-white">
                <QuotePreview
                  ref={quoteRef}
                  unit={selectedUnit}
                  policy={selectedPolicy}
                  policies={selectedPolicies}
                  paymentPlan={selectedPlan}
                  schedules={paymentScheduleResult?.installments || []}
                  basePrice={priceResult.basePrice}
                  finalPrice={priceResult.finalPrice}
                  totalDiscount={priceResult.totalDiscount}
                  discountBreakdown={priceResult.discountBreakdown}
                  discountMode={priceResult.discountCalculationMode}
                  loanAmount={loanAmount}
                  equityAmount={equityAmount}
                  interestRate={interestRate}
                  loanTerm={loanTermMonths}
                  monthlyPayment={loanResult?.monthlyPayment}
                  bankName={selectedLoanProgram?.bankName}
                  repaymentMethod={repaymentMethod}
                  supportRate={selectedLoanProgram?.supportRate}
                  supportPeriodMonths={selectedLoanProgram?.supportPeriodMonths}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerEmail={customerEmail}
                  salesName={salesName}
                  salesPhone={salesPhone}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offscreen fallback template for direct export when modal is closed */}
      {!isPreviewModalOpen && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '800px',
            zIndex: -9999,
            opacity: 0.001,
            pointerEvents: 'none',
          }}
        >
          <QuotePreview
            ref={quoteRef}
            unit={selectedUnit || unitsList[0]}
            policy={selectedPolicy}
            policies={selectedPolicies}
            paymentPlan={selectedPlan}
            schedules={paymentScheduleResult?.installments || []}
            basePrice={priceResult.basePrice}
            finalPrice={priceResult.finalPrice}
            totalDiscount={priceResult.totalDiscount}
            discountBreakdown={priceResult.discountBreakdown}
            discountMode={priceResult.discountCalculationMode}
            loanAmount={loanAmount}
            equityAmount={equityAmount}
            interestRate={interestRate}
            loanTerm={loanTermMonths}
            monthlyPayment={loanResult?.monthlyPayment}
            bankName={selectedLoanProgram?.bankName}
            repaymentMethod={repaymentMethod}
            supportRate={selectedLoanProgram?.supportRate}
            supportPeriodMonths={selectedLoanProgram?.supportPeriodMonths}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            salesName={salesName}
            salesPhone={salesPhone}
          />
        </div>
      )}
    </div>
  )
}
