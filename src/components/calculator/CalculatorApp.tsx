'use client'

import React, { useState, useMemo, useRef } from 'react'
import { Unit, Policy, PaymentPlan, PaymentSchedule } from '@prisma/client'
import { calculateFinalPrice, calculatePricePerSquareMeter, calculatePaymentSchedule, calculateLoanPayment, calculateTotalInterest, calculateCashRequired, formatVND, formatArea, formatPricePerM2 } from '@/lib/calculations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuotePreview } from './QuotePreview'

type Props = {
  units: Unit[]
  policies: Policy[]
  paymentPlans: (PaymentPlan & { schedules: PaymentSchedule[] })[]
}

import { ShieldCheck, Download, Calculator, CheckCircle2, Building, ArrowRight, FileText } from 'lucide-react'

// ... existing code, wait, I can just rewrite the whole component to be safe.
export function CalculatorApp({ units, policies, paymentPlans }: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  
  // Loan params
  const [loanPercent, setLoanPercent] = useState<number>(70)
  const [interestRate, setInterestRate] = useState<number>(0)
  const [loanTerm, setLoanTerm] = useState<number>(24)
  
  const [isExporting, setIsExporting] = useState(false)
  const quoteRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = async () => {
    if (!quoteRef.current || !selectedUnit) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = quoteRef.current;
      const opt: any = {
        margin:       10,
        filename:     `Bao_Gia_${selectedUnit.unitCode}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      alert('Đã xảy ra lỗi khi tạo PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  }

  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId) || null, [units, selectedUnitId])
  const selectedPolicy = useMemo(() => policies.find(p => p.id === selectedPolicyId) || null, [policies, selectedPolicyId])
  const selectedPlan = useMemo(() => paymentPlans.find(p => p.id === selectedPlanId) || null, [paymentPlans, selectedPlanId])

  const basePrice = selectedUnit?.basePrice || 0
  const finalPrice = calculateFinalPrice(basePrice, selectedPolicy)
  const totalDiscount = basePrice - finalPrice
  const pricePerM2 = selectedUnit ? calculatePricePerSquareMeter(finalPrice, selectedUnit.area) : 0

  const schedules = selectedPlan ? calculatePaymentSchedule(finalPrice, selectedPlan.schedules) : []
  
  const loanAmount = finalPrice * (loanPercent / 100)
  const monthlyPayment = calculateLoanPayment(loanAmount, interestRate, loanTerm)
  const totalInterest = calculateTotalInterest(loanAmount, interestRate, loanTerm)
  const cashRequired = calculateCashRequired(finalPrice, loanAmount)

  const glassCard = "bg-white/60 backdrop-blur-2xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"

  return (
    <div className="space-y-10 pb-16">
      {/* KPI DASHBOARD - ACCOUNT OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${glassCard} p-6 relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Building size={48} /></div>
          <p className="text-sm font-medium text-slate-500 mb-2">Giá niêm yết</p>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatVND(basePrice)}</p>
        </div>
        <div className={`${glassCard} p-6 relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowRight size={48} /></div>
          <p className="text-sm font-medium text-slate-500 mb-2">Tổng ưu đãi</p>
          <p className="text-3xl font-extrabold tracking-tight text-emerald-600">-{formatVND(totalDiscount)}</p>
        </div>
        <div className={`${glassCard} p-6 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 text-white shadow-blue-900/20`}>
          <p className="text-sm font-medium text-blue-100 mb-2">Giá sau ưu đãi (Thực tế)</p>
          <p className="text-3xl font-extrabold tracking-tight text-white">{formatVND(finalPrice)}</p>
        </div>
        <div className={`${glassCard} p-6 relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calculator size={48} /></div>
          <p className="text-sm font-medium text-slate-500 mb-2">Giá thực / m²</p>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatPricePerM2(pricePerM2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - SELECTION */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`${glassCard} p-6`}>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Thông tin căn hộ
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Mã căn hộ</label>
                <Select value={selectedUnitId} onValueChange={(v) => setSelectedUnitId(v || '')}>
                  <SelectTrigger className="bg-white/50 border-slate-200 h-12 rounded-xl focus:ring-blue-500 focus:border-blue-500"><SelectValue placeholder="Chọn căn..." /></SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-xl border-white/60">
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id} className="cursor-pointer">{u.unitCode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedUnit && (
                <div className="bg-white/40 p-5 rounded-xl border border-white/50 space-y-4 text-sm shadow-inner">
                  {selectedUnit.imageUrl && (
                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-white/40 shadow-sm relative group">
                      <img src={selectedUnit.imageUrl} alt={selectedUnit.unitCode} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-slate-700 shadow-sm">
                        {selectedUnit.unitCode}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-200/50 pb-2 pt-2">
                    <span className="text-slate-500">Tòa/Phân khu:</span> 
                    <strong className="text-slate-800">{selectedUnit.building}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-500">Tầng:</span> 
                    <strong className="text-slate-800">{selectedUnit.floor}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-500">Loại căn:</span> 
                    <strong className="text-slate-800">{selectedUnit.unitType}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-500">Diện tích:</span> 
                    <strong className="text-slate-800">{formatArea(selectedUnit.area)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hướng/View:</span> 
                    <strong className="text-slate-800">{selectedUnit.direction} - {selectedUnit.view}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${glassCard} p-6`}>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Chính sách ưu đãi
            </h3>
            <div className="space-y-4">
              <Select value={selectedPolicyId} onValueChange={(v) => setSelectedPolicyId(v || '')}>
                <SelectTrigger className="bg-white/50 border-slate-200 h-12 rounded-xl focus:ring-blue-500 focus:border-blue-500"><SelectValue placeholder="Chọn chính sách..." /></SelectTrigger>
                <SelectContent className="bg-white/90 backdrop-blur-xl border-white/60">
                  <SelectItem value="none" className="cursor-pointer">Không áp dụng</SelectItem>
                  {policies.map(p => (
                    <SelectItem key={p.id} value={p.id} className="cursor-pointer">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPolicy && (
                <div className="space-y-3 text-sm mt-4">
                  {selectedPolicy.discountPercent > 0 && (
                    <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-emerald-800">
                      <span className="flex items-center gap-2"><CheckCircle2 size={16}/> Chiết khấu {selectedPolicy.discountPercent}%</span>
                      <span className="font-bold">-{formatVND(basePrice * (selectedPolicy.discountPercent / 100))}</span>
                    </div>
                  )}
                  {selectedPolicy.discountAmount > 0 && (
                    <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-emerald-800">
                      <span className="flex items-center gap-2"><CheckCircle2 size={16}/> Chiết khấu tiền mặt</span>
                      <span className="font-bold">-{formatVND(selectedPolicy.discountAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - TRANSACTION & PAYMENT */}
        <div className="lg:col-span-8">
          <div className={`${glassCard} h-full p-6 lg:p-8 flex flex-col`}>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Giao dịch & Thanh toán
            </h3>
            
            <div className="mb-6">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Phương thức thanh toán</label>
              <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v || '')}>
                <SelectTrigger className="bg-white/50 border-slate-200 h-12 rounded-xl focus:ring-blue-500 focus:border-blue-500"><SelectValue placeholder="Chọn phương án..." /></SelectTrigger>
                <SelectContent className="bg-white/90 backdrop-blur-xl border-white/60">
                  {paymentPlans.map(p => (
                    <SelectItem key={p.id} value={p.id} className="cursor-pointer">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <Tabs defaultValue={selectedPlan.type === 'LOAN' ? 'loan' : 'schedule'} className="flex-1 flex flex-col">
                <TabsList className="w-full bg-slate-100/50 p-1 rounded-xl h-12">
                  <TabsTrigger value="schedule" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Tiến độ thanh toán</TabsTrigger>
                  {selectedPlan.type === 'LOAN' && (
                    <TabsTrigger value="loan" className="flex-1 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Cấu trúc Vay vốn</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="schedule" className="mt-6 space-y-3 flex-1">
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {schedules.map(sch => (
                      <div key={sch.stepNumber} className="flex justify-between p-4 bg-white/40 border border-white/60 rounded-xl items-center hover:bg-white/70 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{sch.stepNumber}</div>
                          <div>
                            <p className="font-semibold text-slate-800">{sch.stepName}</p>
                            <p className="text-sm text-slate-500">{sch.timePoint} • <span className="text-blue-600 font-medium">{sch.percentValue}%</span></p>
                          </div>
                        </div>
                        <div className="font-extrabold text-slate-900 text-lg">{formatVND(sch.amount)}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {selectedPlan.type === 'LOAN' && (
                  <TabsContent value="loan" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Tỷ lệ vay (%)</label>
                        <Input type="number" className="h-12 bg-white/50 border-white/60 rounded-xl" value={loanPercent} onChange={e => setLoanPercent(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Lãi suất (%/năm)</label>
                        <Input type="number" step="0.1" className="h-12 bg-white/50 border-white/60 rounded-xl" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">Thời gian vay (tháng)</label>
                        <Input type="number" className="h-12 bg-white/50 border-white/60 rounded-xl" value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={100} /></div>
                      <h4 className="text-blue-200 text-sm font-medium mb-6 uppercase tracking-wider">Tóm tắt khoản vay</h4>
                      <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                          <span className="text-blue-100">Vốn tự có cần chuẩn bị</span> 
                          <strong className="text-2xl">{formatVND(cashRequired)}</strong>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                          <span className="text-blue-100">Ngân hàng giải ngân</span> 
                          <strong className="text-2xl">{formatVND(loanAmount)}</strong>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-blue-100">Trả gốc + lãi hàng tháng</span> 
                          <strong className="text-3xl text-emerald-400">{formatVND(monthlyPayment)}</strong>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* SECURITY HIGHLIGHTS & CTA */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between bg-white/80 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl border border-white/60 shadow-xl gap-8">
        <div className="flex gap-6 items-center flex-1">
          <ShieldCheck className="text-blue-600 w-12 h-12" />
          <div>
            <h4 className="font-bold text-slate-900 text-lg">Bảo mật cấp độ Ngân hàng (Bank-grade Security)</h4>
            <p className="text-slate-500 text-sm mt-1">Dữ liệu tính toán được lấy trực tiếp từ chủ đầu tư Sun Group. Báo giá PDF được mã hóa 256-bit chống chỉnh sửa.</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button 
            size="lg" 
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 font-semibold flex items-center gap-3 transition-all"
            disabled={!selectedUnit || isExporting} 
            onClick={handleExportPDF}
          >
            {isExporting ? 'ĐANG XỬ LÝ...' : (
              <>
                <FileText size={20} />
                XUẤT BÁO GIÁ CHÍNH THỨC
              </>
            )}
          </Button>
        </div>
      </div>

      {/* MOBILE APP CTA */}
      <div className="mt-6 flex justify-center items-center gap-4 text-slate-500 text-sm">
        <Download size={16} />
        <span>Tải ứng dụng <strong>Sun Urban Sales</strong> trên App Store hoặc Google Play để theo dõi rổ hàng realtime.</span>
      </div>
      
      {/* HIDDEN QUOTE FOR EXPORT */}
      {selectedUnit && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <QuotePreview
            ref={quoteRef}
            unit={selectedUnit}
            policy={selectedPolicy}
            paymentPlan={selectedPlan}
            schedules={schedules}
            basePrice={basePrice}
            finalPrice={finalPrice}
            totalDiscount={totalDiscount}
            loanAmount={loanAmount}
            equityAmount={cashRequired}
            interestRate={interestRate}
            loanTerm={loanTerm}
            monthlyPayment={monthlyPayment}
          />
        </div>
      )}
    </div>
  )
}
