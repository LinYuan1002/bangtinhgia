'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatVND, formatArea } from '@/lib/calculations'
import { useRouter } from 'next/navigation'
import { getStoredUnits } from '@/lib/clientStore'

export function InventoryTable({ initialUnits }: { initialUnits: any[] }) {
  const [units, setUnits] = useState<any[]>(initialUnits)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    setUnits(getStoredUnits(initialUnits))
    const handler = (e: any) => {
      if (e.detail) setUnits(e.detail)
    }
    window.addEventListener('sun_units_updated', handler)
    return () => window.removeEventListener('sun_units_updated', handler)
  }, [initialUnits])

  const filtered = units.filter((u) => {
    const bCode = u.buildingCode || u.building || ''
    return (
      u.unitCode.toLowerCase().includes(search.toLowerCase()) ||
      bCode.toLowerCase().includes(search.toLowerCase())
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'EXCLUSIVE':
        return (
          <span className="inline-block px-2.5 py-1 text-[11px] font-black rounded-md bg-emerald-500 text-white uppercase tracking-wider">
            ĐỘC QUYỀN
          </span>
        )
      case 'HOLD':
      case 'LOCKED':
        return (
          <span className="inline-block px-2.5 py-1 text-[11px] font-black rounded-md bg-amber-400 text-slate-950 uppercase tracking-wider">
            ĐANG LOCK
          </span>
        )
      case 'CHECK_ADMIN':
      case 'PENDING':
        return (
          <span className="inline-block px-2.5 py-1 text-[11px] font-black rounded-md bg-slate-500 text-white uppercase tracking-wider">
            CHECK ADMIN
          </span>
        )
      case 'SOLD':
        return (
          <span className="inline-block px-2.5 py-1 text-[11px] font-black rounded-md bg-rose-600 text-white uppercase tracking-wider">
            ĐÃ BÁN
          </span>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Legend Bar matching sales spreadsheet */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="font-bold text-slate-700">Chú thích trạng thái:</div>
        <div className="flex flex-wrap items-center gap-2 font-black text-[11px]">
          <span className="px-2.5 py-0.5 rounded bg-emerald-500 text-white">ĐỘC QUYỀN</span>
          <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950">ĐANG LOCK</span>
          <span className="px-2.5 py-0.5 rounded bg-slate-500 text-white">CHECK ADMIN</span>
          <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white">ĐÃ BÁN</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Tìm kiếm mã căn, tòa..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="text-sm text-muted-foreground">
          Đang hiển thị {filtered.length} / {units.length} căn
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
