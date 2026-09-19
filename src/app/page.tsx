import { getUnits, getPolicies, getPaymentPlans } from '@/app/actions'
import { CalculatorApp } from '@/components/calculator/CalculatorApp'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [units, policies, paymentPlans] = await Promise.all([
    getUnits(),
    getPolicies(),
    getPaymentPlans()
  ])

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SUN URBAN CITY</h1>
          <p className="text-muted-foreground">SALES PRICE CALCULATOR</p>
        </div>
      </div>
      
      <CalculatorApp 
        units={units} 
        policies={policies} 
        paymentPlans={paymentPlans} 
      />
    </main>
  )
}
