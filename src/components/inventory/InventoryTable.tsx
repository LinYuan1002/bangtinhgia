'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatVND, formatArea } from '@/lib/calculations'
import { useRouter } from 'next/navigation'

export function InventoryTable({ initialUnits }: { initialUnits: any[] }) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = initialUnits.filter((u) => {
    const bCode = u.buildingCode || u.building || ''
    return (
      u.unitCode.toLowerCase().includes(search.toLowerCase()) ||
      bCode.toLowerCase().includes(search.toLowerCase())
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            AVAILABLE
          </Badge>
        )
      case 'HOLD':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            HOLD
          </Badge>
        )
      case 'SOLD':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
            SOLD
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Tìm kiếm mã căn, tòa..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="text-sm text-muted-foreground">
          Đang hiển thị {filtered.length} / {initialUnits.length} căn
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Mã căn</TableHead>
              <TableHead>Tòa</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Diện tích</TableHead>
              <TableHead>Hướng</TableHead>
              <TableHead>View</TableHead>
              <TableHead className="text-right">Giá niêm yết</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((unit) => (
              <TableRow
                key={unit.id}
                className="cursor-pointer hover:bg-slate-50 transition"
                onClick={() => router.push('/')}
              >
                <TableCell className="font-semibold text-blue-600">{unit.unitCode}</TableCell>
                <TableCell>{unit.buildingCode || unit.building}</TableCell>
                <TableCell>{unit.floorNumber || unit.floor}</TableCell>
                <TableCell>{unit.unitTypeName || unit.unitType}</TableCell>
                <TableCell>{formatArea(unit.area)}</TableCell>
                <TableCell>{unit.direction || '—'}</TableCell>
                <TableCell>{unit.view || '—'}</TableCell>
                <TableCell className="text-right font-semibold">{formatVND(unit.basePrice)}</TableCell>
                <TableCell>{getStatusBadge(unit.status)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy căn hộ nào phù hợp
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
