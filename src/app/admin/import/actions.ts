'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ImportRowResult = {
  row: number
  unitCode: string
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'SKIPPED'
  issues: { field: string; message: string; severity: 'error' | 'warning' }[]
  data?: any
}

export async function processImport(params: {
  fileName: string
  rows: any[]          // parsed + mapped rows from client
  duplicateAction: 'SKIP' | 'UPDATE' | 'CREATE_NEW'
}): Promise<{ batchId: string; results: ImportRowResult[]; summary: any }> {
  const { fileName, rows, duplicateAction } = params

  // Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      status: 'PROCESSING',
      totalRows: rows.length,
    },
  })

  const results: ImportRowResult[] = []
  let successCount = 0
  let warningCount = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is header
    const issues: ImportRowResult['issues'] = []

    // ── Validate required fields ──
    const required = ['unitCode', 'buildingCode', 'floorNumber', 'area', 'basePrice']
    for (const field of required) {
      if (!row[field] && row[field] !== 0) {
        issues.push({ field, message: `${field} là bắt buộc`, severity: 'error' })
      }
    }

    // ── Validate numeric fields ──
    const numericFields = ['area', 'basePrice', 'floorNumber']
    for (const field of numericFields) {
      if (row[field] !== undefined && isNaN(Number(row[field]))) {
        issues.push({ field, message: `${field} phải là số`, severity: 'error' })
      }
    }

    // ── Validate status ──
    const validStatuses = ['AVAILABLE', 'HOLD', 'SOLD', 'LOCKED', 'UNAVAILABLE']
    if (row.status && !validStatuses.includes(row.status)) {
      issues.push({
        field: 'status',
        message: `Trạng thái "${row.status}" không hợp lệ. Phải là: ${validStatuses.join(', ')}`,
        severity: 'error',
      })
    }

    const hasErrors = issues.some((i) => i.severity === 'error')
    const hasWarnings = issues.some((i) => i.severity === 'warning')

    if (hasErrors) {
      errorCount++
      results.push({
        row: rowNum,
        unitCode: row.unitCode || '?',
        status: 'ERROR',
        issues,
      })

      await prisma.importRow.create({
        data: {
          batchId: batch.id,
          rowNumber: rowNum,
          rawData: JSON.stringify(row),
          status: 'ERROR',
          issues: JSON.stringify(issues),
        },
      })
      continue
    }

    // ── Check for duplicate ──
    const existing = await prisma.unit.findUnique({
      where: { unitCode: row.unitCode },
    })

    if (existing) {
      if (duplicateAction === 'SKIP') {
        warningCount++
        results.push({
          row: rowNum,
          unitCode: row.unitCode,
          status: 'SKIPPED',
          issues: [{ field: 'unitCode', message: 'Mã căn đã tồn tại, bỏ qua', severity: 'warning' }],
        })
        await prisma.importRow.create({
          data: {
            batchId: batch.id,
            rowNumber: rowNum,
            rawData: JSON.stringify(row),
            status: 'SKIPPED',
            issues: JSON.stringify([{ field: 'unitCode', message: 'Duplicate skipped', severity: 'warning' }]),
          },
        })
        continue
      } else if (duplicateAction === 'UPDATE') {
        const basePrice = parseFloat(row.basePrice) || 0
        const area = parseFloat(row.area) || 0

        // Log price history if changed
        if (existing.basePrice !== basePrice) {
          await prisma.priceHistory.create({
            data: {
              unitId: existing.id,
              oldPrice: existing.basePrice,
              newPrice: basePrice,
              reason: `Import: ${fileName}`,
              changedBy: 'Import',
            },
          })
        }

        await prisma.unit.update({
          where: { id: existing.id },
          data: {
            buildingCode: row.buildingCode,
            floorNumber: parseInt(row.floorNumber) || 0,
            unitTypeName: row.unitTypeName || '',
            area,
            direction: row.direction || '',
            view: row.view || '',
            basePrice,
            pricePerM2: area > 0 ? basePrice / area : 0,
            status: row.status || 'AVAILABLE',
          },
        })

        successCount++
        results.push({
          row: rowNum,
          unitCode: row.unitCode,
          status: hasWarnings ? 'WARNING' : 'SUCCESS',
          issues,
          data: row,
        })
        continue
      }
      // CREATE_NEW: fall through to create
    }

    // ── Create new unit ──
    try {
      const basePrice = parseFloat(row.basePrice) || 0
      const area = parseFloat(row.area) || 0

      await prisma.unit.create({
        data: {
          unitCode: row.unitCode,
          buildingCode: row.buildingCode,
          floorNumber: parseInt(row.floorNumber) || 0,
          unitTypeName: row.unitTypeName || '',
          area,
          direction: row.direction || '',
          view: row.view || '',
          basePrice,
          pricePerM2: area > 0 ? basePrice / area : 0,
          status: row.status || 'AVAILABLE',
        },
      })

      successCount++
      if (hasWarnings) warningCount++

      results.push({ row: rowNum, unitCode: row.unitCode, status: hasWarnings ? 'WARNING' : 'SUCCESS', issues, data: row })

      await prisma.importRow.create({
        data: {
          batchId: batch.id,
          rowNumber: rowNum,
          rawData: JSON.stringify(row),
          mappedData: JSON.stringify(row),
          status: hasWarnings ? 'WARNING' : 'SUCCESS',
          issues: issues.length > 0 ? JSON.stringify(issues) : null,
        },
      })
    } catch (e: any) {
      errorCount++
      results.push({
        row: rowNum,
        unitCode: row.unitCode,
        status: 'ERROR',
        issues: [{ field: 'db', message: e.message, severity: 'error' }],
      })
    }
  }

  // Update batch status
  const finalStatus =
    errorCount > 0 && successCount === 0
      ? 'FAILED'
      : warningCount > 0 || errorCount > 0
      ? 'COMPLETED_WITH_WARNINGS'
      : 'COMPLETED'

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: finalStatus,
      totalRows: rows.length,
      successRows: successCount,
      warningRows: warningCount,
      errorRows: errorCount,
    },
  })

  revalidatePath('/admin/units')
  revalidatePath('/admin/import')

  return {
    batchId: batch.id,
    results,
    summary: {
      total: rows.length,
      success: successCount,
      warnings: warningCount,
      errors: errorCount,
      status: finalStatus,
    },
  }
}

export async function getImportBatches() {
  return prisma.importBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
