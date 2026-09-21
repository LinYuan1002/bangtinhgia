'use client'

import React, { useState, useMemo } from 'react'
import {
  OFFICIAL_POLICIES,
  calculateQuote,
  formatVNDExact,
  roundMoney,
  UnitType,
  PolicyVersion,
  CalculationInput,
} from '@/lib/pricing'

export function PricingAdminClient() {
  const [selectedPolicyCode, setSelectedPolicyCode] = useState<string>('CSUD14')
  const [activeTab, setActiveTab] = useState<'matrix' | 'sandbox' | 'raw_json'>('matrix')

  // Sandbox simulation states
  const [testBuilding, setTestBuilding] = useState<string>('P3')
  const [testUnitType, setTestUnitType] = useState<UnitType>('1BR_PLUS')
  const [testNetArea, setTestNetArea] = useState<number>(45.0)
  const [testBasePrice, setTestBasePrice] = useState<number>(1_650_000_000)
  const [testPaymentOption, setTestPaymentOption] = useState<'NO_LOAN' | 'EARLY_PAYMENT' | 'LOAN'>('EARLY_PAYMENT')
  const [testEarlyPercent, setTestEarlyPercent] = useState<number>(95)
  const [testEarlyDeadline, setTestEarlyDeadline] = useState<string>('2026-08-25')
  const [testLoanPercent, setTestLoanPercent] = useState<number>(70)

  const currentPolicy = useMemo(() => {
    return OFFICIAL_POLICIES.find((p) => p.policyCode === selectedPolicyCode) || OFFICIAL_POLICIES[0]
  }, [selectedPolicyCode])

  // Sync test building when policy changes
  const handleSelectPolicy = (code: string) => {
    setSelectedPolicyCode(code)
    const pol = OFFICIAL_POLICIES.find((p) => p.policyCode === code)
    if (pol && pol.buildings.length > 0) {
      setTestBuilding(pol.buildings[0])
      if (pol.earlyPaymentRules.length > 0) {
        setTestEarlyDeadline(pol.earlyPaymentRules[0].deadline)
      }
    }
  }

  // Live Sandbox Calculation
  const sandboxResult = useMemo(() => {
    try {
      const input: CalculationInput = {
        unit: {
          id: 'test-unit',
          building: testBuilding,
          floor: 8,
          unitNumber: `${testBuilding}-0808`,
          unitType: testUnitType,
          netArea: testNetArea,
          basePrice: testBasePrice,
        },
        policy: currentPolicy,
        paymentOption: testPaymentOption,
        earlyPaymentPercent: testPaymentOption === 'EARLY_PAYMENT' ? testEarlyPercent : undefined,
        earlyPaymentDeadline: testPaymentOption === 'EARLY_PAYMENT' ? testEarlyDeadline : undefined,
        loanPercent: testPaymentOption === 'LOAN' ? testLoanPercent : undefined,
      }

      return {
        quote: calculateQuote(input, currentPolicy),
        error: null,
      }
    } catch (err: any) {
      return {
        quote: null,
        error: err.message || 'Lỗi tính toán',
      }
    }
  }, [
    testBuilding,
    testUnitType,
    testNetArea,
    testBasePrice,
    testPaymentOption,
    testEarlyPercent,
    testEarlyDeadline,
    testLoanPercent,
    currentPolicy,
  ])

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧮</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              BỘ MÁY TÍNH GIÁ BẤT ĐỘNG SẢN SUN URBAN CITY
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý chính sách bán hàng theo mô hình: <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">PROJECT → POLICY → BUILDING → UNIT TYPE → UNIT</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            5 Chính sách kích hoạt
          </span>
        </div>
      </div>

      {/* ── POLICY SELECTOR TABS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {OFFICIAL_POLICIES.map((p) => {
          const isSelected = p.policyCode === selectedPolicyCode
          return (
            <button
              key={p.policyCode}
              type="button"
              onClick={() => handleSelectPolicy(p.policyCode)}
              className={`p-4 rounded-xl text-left border transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-base">{p.policyCode}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className={`text-xs mt-1 font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-800'}`}>
                {p.policyName}
              </p>
              <div className="mt-2 text-[11px] space-y-0.5">
                <div className={isSelected ? 'text-blue-200' : 'text-slate-500'}>
                  Tòa: <strong className={isSelected ? 'text-white' : 'text-slate-800'}>{p.buildings.join(', ')}</strong>
                </div>
                <div className={isSelected ? 'text-blue-200' : 'text-slate-500'}>
                  Hoàn thiện: <strong className={isSelected ? 'text-white' : 'text-slate-800'}>{p.completionPriceIncludesVAT ? 'Đã gồm VAT' : 'Chưa gồm VAT'}</strong>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── SUB NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'matrix' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 Ma trận Thông số & Quy tắc
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'sandbox' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🧪 Sandbox Thử nghiệm Tính Giá
        </button>
        <button
          onClick={() => setActiveTab('raw_json')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'raw_json' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {'{ }'} Cấu trúc Dữ liệu JSON
        </button>
      </div>

      {/* ── TAB 1: PARAMETER MATRIX ── */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1 & 2: Policy parameters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {currentPolicy.policyCode} (Phiên bản {currentPolicy.version})
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{currentPolicy.policyName}</h2>
                  <p className="text-xs text-slate-500">{currentPolicy.description}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500">Hiệu lực từ:</span>
                  <div className="font-bold text-slate-900">{currentPolicy.effectiveFrom}</div>
                </div>
              </div>

              {/* Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Tòa nhà áp dụng:</span>
                  <strong className="text-blue-700 text-sm">{currentPolicy.buildings.join(', ')}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Đơn giá hoàn thiện:</span>
                  <strong className={currentPolicy.completionPriceIncludesVAT ? 'text-emerald-700' : 'text-amber-700'}>
                    {currentPolicy.completionPriceIncludesVAT ? 'ĐÃ GỒM VAT (10%)' : 'CHƯA GỒM VAT'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Cơ sở hạn mức vay:</span>
                  <strong className="text-purple-700 text-xs">
                    {currentPolicy.loanRules.loanBasis === 'RAW_PRICE_INCL_VAT' ? '70% Giá thô gồm VAT' : '70% Tổng giá gồm VAT'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Sun Early Key:</span>
                  <strong className={currentPolicy.earlyKeyEligible ? 'text-emerald-700' : 'text-slate-500'}>
                    {currentPolicy.earlyKeyEligible ? '★ CÓ (Đóng >= 70%)' : 'Không áp dụng'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Completion rates table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
                <span>1. Đơn giá Hoàn thiện theo Loại Căn ({currentPolicy.policyCode})</span>
                <span className="text-xs normal-case font-normal text-slate-500">
                  Tính trên Diện tích thông thủy (netArea)
                </span>
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">Loại Căn</th>
                      <th className="p-3 text-right">Đơn Giá Hoàn Thiện</th>
                      <th className="p-3 text-center">Tình trạng VAT</th>
                      <th className="p-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(currentPolicy.completionRates).map(([type, rate]) => (
                      <tr key={type} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{type}</td>
                        <td className="p-3 text-right font-black text-blue-700 text-sm">
                          {formatVNDExact(rate)} / m²
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              currentPolicy.completionPriceIncludesVAT
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {currentPolicy.completionPriceIncludesVAT ? 'Đã gồm VAT' : 'Chưa gồm VAT'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {currentPolicy.completionPriceIncludesVAT
                            ? 'net = rate * m² / 1.1; vat = 10%'
                            : 'net = rate * m²; vat = net * 10%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Early payment discounts table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
                <span>2. Bảng Tỷ lệ Chiết khấu Thanh toán sớm (Early Payment)</span>
                <span className="text-xs normal-case font-bold text-rose-600">
                  Cơ sở: Nghiêm ngặt trên Giá thô chưa VAT (rawPriceNet)
                </span>
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">Mức Thanh Toán</th>
                      <th className="p-3">Hạn Chót Thanh Toán</th>
                      <th className="p-3 text-right">Tỷ Lệ Chiết Khấu</th>
                      <th className="p-3">Cơ sở tính chiết khấu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPolicy.earlyPaymentRules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          Thanh toán {rule.paymentPercent}%
                        </td>
                        <td className="p-3 text-slate-700">
                          {rule.deadlineLabel || rule.deadline}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 text-sm">
                          {(rule.discountRate * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          rawPriceNet (Giá thô chưa VAT)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Col 3: Side summary & Quick rules */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-blue-400 uppercase tracking-wider">
                Quy Tắc Nghiệp Vụ Cốt Lõi
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold text-base">•</span>
                  <span>
                    <strong>Không gộp chung giá:</strong> Căn hộ thô, hoàn thiện, VAT và KPBT tách biệt thành các dòng tính toán độc lập.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold text-base">•</span>
                  <span>
                    <strong>Cơ sở chiết khấu:</strong> Chiết khấu không vay (5%) và Chiết khấu thanh toán sớm tính nghiêm ngặt trên <em>Giá thô chưa VAT</em>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold text-base">•</span>
                  <span>
                    <strong>Lãi suất trả sớm (8%/năm):</strong> Khách hàng thanh toán vốn tự có trước hạn ít nhất 10 ngày được tính lãi 8%/năm cho số ngày sớm.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold text-base">•</span>
                  <span>
                    <strong>Sun Early Key:</strong> Áp dụng riêng cho CSƯĐ16 và CSƯĐ09 khi thanh toán đạt từ 70% trở lên.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold text-base">•</span>
                  <span>
                    <strong>Tiền cọc theo loại căn:</strong> Studio 50tr, 1BR+ 100tr, 2BR 150tr, 3BR 200tr khấu trừ tại Đợt 2.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SANDBOX TESTER ── */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <span>⚙️</span> Tham Số Thử Nghiệm Sandbox
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chính sách áp dụng</label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900">
                  {currentPolicy.policyCode} — {currentPolicy.policyName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tòa nhà</label>
                  <select
                    value={testBuilding}
                    onChange={(e) => setTestBuilding(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    {currentPolicy.buildings.map((b) => (
                      <option key={b} value={b}>
                        Tòa {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại căn</label>
                  <select
                    value={testUnitType}
                    onChange={(e) => setTestUnitType(e.target.value as UnitType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="STUDIO">STUDIO</option>
                    <option value="1BR_PLUS">1BR_PLUS</option>
                    <option value="2BR">2BR</option>
                    <option value="3BR">3BR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diện tích thông thủy (m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={testNetArea}
                    onChange={(e) => setTestNetArea(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    step="10000000"
                    value={testBasePrice}
                    onChange={(e) => setTestBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phương án thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NO_LOAN', 'EARLY_PAYMENT', 'LOAN'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTestPaymentOption(opt)}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition ${
                        testPaymentOption === opt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt === 'NO_LOAN' ? 'Không vay (5%)' : opt === 'EARLY_PAYMENT' ? 'Thanh toán sớm' : 'Vay NH'}
                    </button>
                  ))}
                </div>
              </div>

              {testPaymentOption === 'EARLY_PAYMENT' && (
                <div className="space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="font-bold text-amber-900 text-xs">Cấu hình Thanh toán sớm:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Mức thanh toán</label>
                      <select
                        value={testEarlyPercent}
                        onChange={(e) => setTestEarlyPercent(parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value={95}>95%</option>
                        <option value={70}>70%</option>
                        <option value={50}>50%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Hạn thanh toán</label>
                      <select
                        value={testEarlyDeadline}
                        onChange={(e) => setTestEarlyDeadline(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                      >
                        {currentPolicy.earlyPaymentRules
                          .filter((r) => r.paymentPercent === testEarlyPercent)
                          .map((r, i) => (
                            <option key={i} value={r.deadline}>
                              {r.deadlineLabel || r.deadline} ({(r.discountRate * 100).toFixed(1)}%)
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {testPaymentOption === 'LOAN' && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                  <div className="font-bold text-blue-900 text-xs">Cấu hình Gói vay:</div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Tỷ lệ vay (%)</label>
                    <input
                      type="number"
                      value={testLoanPercent}
                      max={70}
                      onChange={(e) => setTestLoanPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Cơ sở: {currentPolicy.loanRules.loanBasis} (Tối đa {currentPolicy.loanRules.maxLoanPercent}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results: 18 Breakdown Items */}
          <div className="lg:col-span-2 space-y-4">
            {sandboxResult.quote ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Kết quả Bóc tách Tính Giá (18 Mục Chi Tiết)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tính theo chính sách <strong className="text-blue-700">{sandboxResult.quote.policyCode}</strong> — Căn {sandboxResult.quote.unitType} ({sandboxResult.quote.netArea} m²)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Giá HĐMB cuối cùng:</span>
                    <div className="text-xl font-black text-blue-700">
                      {formatVNDExact(sandboxResult.quote.finalPrice)}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {sandboxResult.quote.earlyKeyEligible && (
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                        sandboxResult.quote.earlyKeyQualified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ★ Sun Early Key: {sandboxResult.quote.earlyKeyQualified ? 'ĐỦ ĐIỀU KIỆN' : 'CHƯA ĐẠT (Cần >= 70%)'}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-900">
                    Tổng chiết khấu: -{formatVNDExact(sandboxResult.quote.totalDiscount)}
                  </span>
                  {sandboxResult.quote.loanAmount > 0 && (
                    <span className="px-2.5 py-1 rounded-full font-bold bg-purple-100 text-purple-900">
                      Ngân hàng cho vay: {formatVNDExact(sandboxResult.quote.loanAmount)}
                    </span>
                  )}
                </div>

                {/* Table Breakdown */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5">Thành phần chi phí</th>
                        <th className="p-2.5 text-right">Giá trị (VNĐ)</th>
                        <th className="p-2.5">Công thức & Căn cứ nghiệp vụ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sandboxResult.quote.calculationBreakdown.map((item, idx) => (
                        <tr
                          key={item.key}
                          className={
                            item.category === 'FINAL'
                              ? 'bg-blue-50/60 font-bold'
                              : item.category === 'DISCOUNT' && item.amount > 0
                              ? 'bg-emerald-50/40'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="p-2.5 font-semibold text-slate-900">
                            {item.label}
                          </td>
                          <td
                            className={`p-2.5 text-right font-bold ${
                              item.category === 'FINAL'
                                ? 'text-blue-700 text-sm font-black'
                                : item.category === 'DISCOUNT' && item.amount > 0
                                ? 'text-emerald-700 font-black'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.amount > 0 && item.category === 'DISCOUNT' ? `-${item.formattedAmount}` : item.formattedAmount}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] leading-relaxed">
                            {item.formulaExplanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200 text-xs">
                {sandboxResult.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: RAW JSON SCHEMA ── */}
      {activeTab === 'raw_json' && (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto">
          <pre>{JSON.stringify(currentPolicy, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
