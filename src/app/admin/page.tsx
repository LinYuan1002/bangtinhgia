import { getUnits, getPolicies, getPaymentPlans } from '@/app/actions'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const units = await getUnits()
  const policies = await getPolicies()
  const paymentPlans = await getPaymentPlans()

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col justify-between items-start mb-8 space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quản trị Hệ thống</h1>
        <p className="text-slate-500">Cài đặt mã căn, giá, hình ảnh, chính sách và phương án thanh toán.</p>
      </div>
      
      <AdminDashboard initialUnits={units} initialPolicies={policies} initialPlans={paymentPlans} />
    </main>
  )
}
