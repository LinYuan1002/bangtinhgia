import { getUnits, getPolicies, getPaymentPlans, getLoanPrograms } from '@/app/actions'
import { CalculatorApp } from '@/components/calculator/CalculatorApp'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [units, policies, paymentPlans, loanPrograms] = await Promise.all([
    getUnits(),
    getPolicies(),
    getPaymentPlans(),
    getLoanPrograms(),
  ])

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SUN URBAN CITY</h1>
          <p className="text-slate-500 font-medium">SALES PRICE CALCULATOR & QUOTE SYSTEM</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <a
            href="/admin/quotes"
            className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            📄 Lịch sử Báo giá
          </a>
          <a
            href="/admin"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            ⚙️ Quản trị Admin
          </a>
        </div>
      </div>

      <CalculatorApp
        units={units}
        policies={policies}
        paymentPlans={paymentPlans}
        loanPrograms={loanPrograms}
      />
    </main>
  )
}
