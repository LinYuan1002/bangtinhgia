import { getUnits } from '@/app/actions'
import { InventoryTable } from '@/components/inventory/InventoryTable'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const units = await getUnits()

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QUỸ CĂN</h1>
          <p className="text-muted-foreground">SUN URBAN CITY INVENTORY</p>
        </div>
      </div>
      
      <InventoryTable initialUnits={units} />
    </main>
  )
}
