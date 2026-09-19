'use client'

import { useState } from 'react'
import { Unit, Policy, PaymentPlan } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { importUnitsCSV } from '@/app/actions'
import { saveUnit, deleteUnit, savePolicy, deletePolicy, savePaymentPlan, deletePaymentPlan } from './actions'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Edit } from 'lucide-react'

type Props = {
  initialUnits: Unit[]
  initialPolicies: Policy[]
  initialPlans: PaymentPlan[]
}

export function AdminDashboard({ initialUnits, initialPolicies, initialPlans }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('units')

  // CSV Import
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const res = await importUnitsCSV(text);
      if (res.error) alert('Lỗi: ' + res.error);
      else {
        alert(`Import thành công ${res.successCount} căn hộ!`);
        setFile(null);
        router.refresh();
      }
    } catch (e) {
      alert('Có lỗi xảy ra khi đọc file CSV.');
    } finally {
      setIsImporting(false);
    }
  }

  // UNIT FORM
  const [unitForm, setUnitForm] = useState<Partial<Unit>>({})
  const handleSaveUnit = async () => {
    await saveUnit(unitForm)
    setUnitForm({})
    router.refresh()
  }

  // POLICY FORM
  const [policyForm, setPolicyForm] = useState<Partial<Policy>>({})
  const handleSavePolicy = async () => {
    await savePolicy(policyForm)
    setPolicyForm({})
    router.refresh()
  }

  // PLAN FORM
  const [planForm, setPlanForm] = useState<Partial<PaymentPlan>>({})
  const handleSavePlan = async () => {
    await savePaymentPlan(planForm)
    setPlanForm({})
    router.refresh()
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-white border shadow-sm w-full justify-start h-14 px-2 gap-2 rounded-xl">
        <TabsTrigger value="units" className="data-[state=active]:bg-slate-100 rounded-lg h-10 px-6">Quản lý Căn hộ</TabsTrigger>
        <TabsTrigger value="policies" className="data-[state=active]:bg-slate-100 rounded-lg h-10 px-6">Chính sách ưu đãi</TabsTrigger>
        <TabsTrigger value="plans" className="data-[state=active]:bg-slate-100 rounded-lg h-10 px-6">Phương án thanh toán</TabsTrigger>
      </TabsList>

      {/* UNITS TAB */}
      <TabsContent value="units" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
            <CardHeader><CardTitle className="text-lg">{unitForm.id ? 'Sửa thông tin căn' : 'Thêm căn mới'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold">Mã căn</label><Input value={unitForm.unitCode || ''} onChange={e => setUnitForm({...unitForm, unitCode: e.target.value})} placeholder="VD: S1-0512"/></div>
                <div><label className="text-xs font-semibold">Tòa</label><Input value={unitForm.building || ''} onChange={e => setUnitForm({...unitForm, building: e.target.value})} placeholder="S1"/></div>
                <div><label className="text-xs font-semibold">Tầng</label><Input type="number" value={unitForm.floor || ''} onChange={e => setUnitForm({...unitForm, floor: Number(e.target.value)})}/></div>
                <div><label className="text-xs font-semibold">Loại căn</label><Input value={unitForm.unitType || ''} onChange={e => setUnitForm({...unitForm, unitType: e.target.value})} placeholder="Studio"/></div>
                <div><label className="text-xs font-semibold">Diện tích (m2)</label><Input type="number" value={unitForm.area || ''} onChange={e => setUnitForm({...unitForm, area: Number(e.target.value)})}/></div>
                <div><label className="text-xs font-semibold">Hướng</label><Input value={unitForm.direction || ''} onChange={e => setUnitForm({...unitForm, direction: e.target.value})}/></div>
                <div><label className="text-xs font-semibold">View</label><Input value={unitForm.view || ''} onChange={e => setUnitForm({...unitForm, view: e.target.value})}/></div>
                <div><label className="text-xs font-semibold">Giá (VND)</label><Input type="number" value={unitForm.basePrice || ''} onChange={e => setUnitForm({...unitForm, basePrice: Number(e.target.value)})}/></div>
                <div className="col-span-2"><label className="text-xs font-semibold">Link Hình ảnh (URL)</label><Input value={unitForm.imageUrl || ''} onChange={e => setUnitForm({...unitForm, imageUrl: e.target.value})} placeholder="https://..."/></div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveUnit}>Lưu lại</Button>
                {unitForm.id && <Button variant="outline" onClick={() => setUnitForm({})}>Hủy</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-lg">Danh sách Căn hộ</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} className="w-[200px]" />
                <Button variant="outline" onClick={handleImport} disabled={!file || isImporting}>Nhập CSV</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-3">Mã căn</th>
                      <th className="p-3">Loại</th>
                      <th className="p-3">Giá</th>
                      <th className="p-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialUnits.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-700">{u.unitCode}</td>
                        <td className="p-3">{u.unitType} ({u.area}m2)</td>
                        <td className="p-3">{(u.basePrice / 1e9).toFixed(3)} Tỷ</td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setUnitForm(u)}><Edit size={16} className="text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={async () => { await deleteUnit(u.id); router.refresh() }}><Trash2 size={16} className="text-red-500" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* POLICIES TAB */}
      <TabsContent value="policies" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
            <CardHeader><CardTitle className="text-lg">{policyForm.id ? 'Sửa chính sách' : 'Thêm chính sách mới'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-xs font-semibold">Tên chính sách</label><Input value={policyForm.name || ''} onChange={e => setPolicyForm({...policyForm, name: e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Chiết khấu (%)</label><Input type="number" value={policyForm.discountPercent || ''} onChange={e => setPolicyForm({...policyForm, discountPercent: Number(e.target.value)})}/></div>
              <div><label className="text-xs font-semibold">Giảm trừ tiền mặt (VND)</label><Input type="number" value={policyForm.discountAmount || ''} onChange={e => setPolicyForm({...policyForm, discountAmount: Number(e.target.value)})}/></div>
              <div><label className="text-xs font-semibold">Quà tặng (VND)</label><Input type="number" value={policyForm.giftValue || ''} onChange={e => setPolicyForm({...policyForm, giftValue: Number(e.target.value)})}/></div>
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSavePolicy}>Lưu chính sách</Button>
                {policyForm.id && <Button variant="outline" onClick={() => setPolicyForm({})}>Hủy</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader><CardTitle className="text-lg">Danh sách Chính sách</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialPolicies.map(p => (
                  <div key={p.id} className="p-4 border rounded-xl bg-slate-50 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-sm text-slate-500 mt-1">Chiết khấu: {p.discountPercent}% | Tiền mặt: {(p.discountAmount/1e6).toFixed(0)}Tr</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setPolicyForm(p)}><Edit size={16} className="text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { await deletePolicy(p.id); router.refresh() }}><Trash2 size={16} className="text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* PAYMENT PLANS TAB */}
      <TabsContent value="plans" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
            <CardHeader><CardTitle className="text-lg">{planForm.id ? 'Sửa phương án' : 'Thêm phương án mới'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-xs font-semibold">Tên phương án</label><Input value={planForm.name || ''} onChange={e => setPlanForm({...planForm, name: e.target.value})}/></div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Loại phương án (STANDARD / LOAN / FAST)</label>
                <Input value={planForm.type || ''} onChange={e => setPlanForm({...planForm, type: e.target.value.toUpperCase()})}/>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSavePlan}>Lưu phương án</Button>
                {planForm.id && <Button variant="outline" onClick={() => setPlanForm({})}>Hủy</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader><CardTitle className="text-lg">Danh sách Phương án Thanh toán</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {initialPlans.map(p => (
                  <div key={p.id} className="p-4 border rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <span className="inline-block px-2 py-1 bg-slate-200 text-xs rounded-md mt-2 font-medium">{p.type}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setPlanForm(p)}><Edit size={16} className="text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { await deletePaymentPlan(p.id); router.refresh() }}><Trash2 size={16} className="text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
