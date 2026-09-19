import { createClient, Client } from '@libsql/client'

// SQL DDL statements for all 14 tables in Prisma schema
export const SCHEMA_STATEMENTS = [
  // 1. Project
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 2. Building
  `CREATE TABLE IF NOT EXISTS "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "totalFloors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Building_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,

  // 3. Floor
  `CREATE TABLE IF NOT EXISTS "Floor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,

  // 4. UnitType
  `CREATE TABLE IF NOT EXISTS "UnitType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,

  // 5. Unit
  `CREATE TABLE IF NOT EXISTS "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "buildingId" TEXT,
    "floorId" TEXT,
    "unitTypeId" TEXT,
    "buildingCode" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "unitCode" TEXT NOT NULL,
    "unitTypeName" TEXT NOT NULL,
    "area" REAL NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 1,
    "direction" TEXT NOT NULL DEFAULT '',
    "view" TEXT NOT NULL DEFAULT '',
    "basePrice" REAL NOT NULL,
    "pricePerM2" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Unit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Unit_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,

  // 6. PriceHistory
  `CREATE TABLE IF NOT EXISTS "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "oldPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "changedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // 7. Policy
  `CREATE TABLE IF NOT EXISTS "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "fixedDiscount" REAL NOT NULL DEFAULT 0,
    "earlyPaymentDiscount" REAL NOT NULL DEFAULT 0,
    "earlyPaymentDiscountPct" REAL NOT NULL DEFAULT 0,
    "specialDiscount" REAL NOT NULL DEFAULT 0,
    "giftValue" REAL NOT NULL DEFAULT 0,
    "discountMode" TEXT NOT NULL DEFAULT 'STACKED',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Policy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,

  // 8. PaymentPlan
  `CREATE TABLE IF NOT EXISTS "PaymentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 9. PaymentScheduleItem
  `CREATE TABLE IF NOT EXISTS "PaymentScheduleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentPlanId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "fixedAmount" REAL,
    "dueDateNote" TEXT,
    "relativeDays" INTEGER,
    CONSTRAINT "PaymentScheduleItem_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // 10. LoanProgram
  `CREATE TABLE IF NOT EXISTS "LoanProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT '',
    "annualInterestRate" REAL NOT NULL,
    "interestRateType" TEXT NOT NULL DEFAULT 'FIXED',
    "maxLoanPercent" REAL NOT NULL DEFAULT 70,
    "maxLoanTermMonths" INTEGER NOT NULL DEFAULT 240,
    "repaymentMethod" TEXT NOT NULL DEFAULT 'EQUAL_PAYMENT',
    "interestSupport" BOOLEAN NOT NULL DEFAULT false,
    "supportRate" REAL NOT NULL DEFAULT 0,
    "supportPeriodMonths" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanProgram_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,

  // 11. Quote
  `CREATE TABLE IF NOT EXISTS "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "policyId" TEXT,
    "paymentPlanId" TEXT,
    "unitSnapshot" TEXT NOT NULL,
    "policySnapshot" TEXT,
    "calculationSnapshot" TEXT NOT NULL,
    "paymentSnapshot" TEXT,
    "loanSnapshot" TEXT,
    "snapshotPrice" REAL NOT NULL,
    "totalDiscount" REAL NOT NULL DEFAULT 0,
    "finalPrice" REAL NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "salesName" TEXT,
    "salesPhone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,

  // 12. ImportBatch
  `CREATE TABLE IF NOT EXISTS "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,

  // 13. ImportRow
  `CREATE TABLE IF NOT EXISTS "ImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" TEXT NOT NULL,
    "mappedData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "issues" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // 14. Setting
  `CREATE TABLE IF NOT EXISTS "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // Indexes
  `CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON "Project"("code");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Building_projectId_code_key" ON "Building"("projectId", "code");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Floor_buildingId_floorNumber_key" ON "Floor"("buildingId", "floorNumber");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UnitType_projectId_code_key" ON "UnitType"("projectId", "code");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Unit_unitCode_key" ON "Unit"("unitCode");`,
  `CREATE INDEX IF NOT EXISTS "Unit_buildingCode_idx" ON "Unit"("buildingCode");`,
  `CREATE INDEX IF NOT EXISTS "Unit_status_idx" ON "Unit"("status");`,
  `CREATE INDEX IF NOT EXISTS "Unit_unitTypeName_idx" ON "Unit"("unitTypeName");`,
  `CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_paymentPlanId_idx" ON "PaymentScheduleItem"("paymentPlanId");`,
  `CREATE INDEX IF NOT EXISTS "ImportRow_batchId_idx" ON "ImportRow"("batchId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");`,
]

export function getTursoClient(): Client | null {
  const url =
    process.env.TURSO_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') ||
    process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : undefined)

  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) return null

  try {
    return createClient({ url, authToken })
  } catch (err) {
    console.error('[db-init] Failed to create libSQL client:', err)
    return null
  }
}

/**
 * Ensures all database tables and indexes exist on the database.
 * If tables are missing, executes the DDL statements.
 */
export async function ensureDatabaseSchema(client?: Client): Promise<{
  success: boolean
  message: string
  tablesCreated?: number
  stats?: any
}> {
  const db = client || getTursoClient()
  if (!db) {
    return {
      success: false,
      message: 'No Turso or libSQL connection configured.',
    }
  }

  try {
    // Check if Unit table already exists
    const checkRes = await db.execute(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='Unit';"
    )
    const exists = Number(checkRes.rows[0]?.count || 0) > 0

    if (!exists) {
      console.log('[db-init] Tables not found. Initializing database schema on Turso...')
      // Execute table creation statements sequentially
      for (const statement of SCHEMA_STATEMENTS) {
        await db.execute(statement)
      }
      console.log('[db-init] All 14 tables and indexes created successfully.')
    }

    // Check row counts
    const unitCountRes = await db.execute('SELECT count(*) as count FROM "Unit";')
    const unitCount = Number(unitCountRes.rows[0]?.count || 0)

    const policyCountRes = await db.execute('SELECT count(*) as count FROM "Policy";')
    const policyCount = Number(policyCountRes.rows[0]?.count || 0)

    const planCountRes = await db.execute('SELECT count(*) as count FROM "PaymentPlan";')
    const planCount = Number(planCountRes.rows[0]?.count || 0)

    const loanCountRes = await db.execute('SELECT count(*) as count FROM "LoanProgram";')
    const loanCount = Number(loanCountRes.rows[0]?.count || 0)

    return {
      success: true,
      message: exists
        ? 'Cơ sở dữ liệu đã sẵn sàng.'
        : 'Đã khởi tạo thành công toàn bộ 14 bảng trên cơ sở dữ liệu Turso Cloud!',
      stats: {
        units: unitCount,
        policies: policyCount,
        paymentPlans: planCount,
        loanPrograms: loanCount,
      },
    }
  } catch (err: any) {
    console.error('[db-init] Error ensuring schema:', err)
    return {
      success: false,
      message: 'Lỗi khi khởi tạo schema: ' + (err.message || String(err)),
    }
  }
}

/**
 * Seeds initial sample data into the database if and only if Unit table is empty.
 */
export async function seedInitialDataIfEmpty(client?: Client) {
  const db = client || getTursoClient()
  if (!db) return

  try {
    const unitCountRes = await db.execute('SELECT count(*) as count FROM "Unit";')
    const unitCount = Number(unitCountRes.rows[0]?.count || 0)

    if (unitCount > 0) return // Already has data, don't overwrite

    console.log('[db-init] Seeding initial data into empty database...')

    // Seed Project
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Project" (id, name, code, description) VALUES (?, ?, ?, ?)`,
      args: ['proj-suc', 'Sun Urban City', 'SUC', 'Khu đô thị nghỉ dưỡng ngoại ô Sun Urban City Hà Nam'],
    })

    // Seed Building S1 & S2
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Building" (id, projectId, name, code, totalFloors) VALUES (?, ?, ?, ?, ?)`,
      args: ['bld-s1', 'proj-suc', 'Tòa S1', 'S1', 25],
    })
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Building" (id, projectId, name, code, totalFloors) VALUES (?, ?, ?, ?, ?)`,
      args: ['bld-s2', 'proj-suc', 'Tòa S2', 'S2', 25],
    })

    // Seed Policies
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Policy" (id, name, description, discountPercent, fixedDiscount, earlyPaymentDiscountPct, giftValue, discountMode, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'policy-eb',
        'Chính sách Mở Bán Đợt 1 - Early Bird',
        'Chiết khấu 5% trực tiếp vào giá bán niêm yết + quà tặng nội thất 20.000.000 VNĐ',
        5,
        0,
        0,
        20000000,
        'STACKED',
        'ACTIVE',
        1,
      ],
    })
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Policy" (id, name, description, discountPercent, fixedDiscount, earlyPaymentDiscountPct, giftValue, discountMode, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'policy-tts',
        'Chính sách Thanh Toán Sớm 95%',
        'Chiết khấu 8% theo phương án TTS + 3% thanh toán sớm trong 15 ngày',
        8,
        0,
        3,
        0,
        'STACKED',
        'ACTIVE',
        2,
      ],
    })

    // Seed Payment Plans
    await db.execute({
      sql: `INSERT OR IGNORE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-std', 'Tiến độ thanh toán chuẩn (6 đợt)', 'STANDARD', 'Thanh toán giãn theo tiến độ thi công', 1],
    })
    const stdSchedules = [
      ['plan-std', 1, 'Đặt cọc', 10, 'Ngay khi ký TTĐC'],
      ['plan-std', 2, 'Đợt 1 (Ký HĐMB)', 15, 'Sau 15 ngày kể từ TTĐC'],
      ['plan-std', 3, 'Đợt 2', 15, 'T+60 ngày'],
      ['plan-std', 4, 'Đợt 3', 15, 'T+120 ngày'],
      ['plan-std', 5, 'Đợt 4 (Bàn giao nhà)', 40, 'Khi có thông báo bàn giao'],
      ['plan-std', 6, 'Đợt 5 (Cấp GCN / Sổ)', 5, 'Khi bàn giao sổ hồng'],
    ]
    for (const s of stdSchedules) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-std-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    // Seed Loan Plan
    await db.execute({
      sql: `INSERT OR IGNORE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-loan', 'Phương án Vay Ngân Hàng 70%', 'LOAN', 'Hỗ trợ lãi suất 0% và ân hạn nợ gốc', 1],
    })
    const loanSchedules = [
      ['plan-loan', 1, 'Đặt cọc (Vốn tự có)', 10, 'Ngay khi ký TTĐC'],
      ['plan-loan', 2, 'Đợt 1 - Vốn tự có (Ký HĐMB)', 20, 'Trong 15 ngày'],
      ['plan-loan', 3, 'Đợt 2 - Ngân hàng giải ngân', 70, 'Sau 15 ngày kể từ HĐMB'],
    ]
    for (const s of loanSchedules) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-loan-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    // Seed Loan Programs
    await db.execute({
      sql: `INSERT OR IGNORE INTO "LoanProgram" (id, name, bankName, annualInterestRate, interestRateType, maxLoanPercent, maxLoanTermMonths, repaymentMethod, interestSupport, supportRate, supportPeriodMonths, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'lp-vcb',
        'Gói vay Vietcombank - HTLS 0% 18 tháng',
        'Vietcombank',
        8.5,
        'FIXED',
        70,
        240,
        'EQUAL_PAYMENT',
        1,
        0,
        18,
        'ACTIVE',
      ],
    })

    // Seed Sample Units
    const sampleUnits = [
      ['unit-s1-0612', 'S1', 6, 'S1-0612', '1PN+', 45.1, 1, 1, 'Nam', 'Công viên trung tâm', 2500000000, 55432372, 'AVAILABLE'],
      ['unit-s1-0615', 'S1', 6, 'S1-0615', '2PN', 60.5, 2, 2, 'Đông Nam', 'Hồ bơi sinh thái', 3500000000, 57851239, 'AVAILABLE'],
      ['unit-s1-1205', 'S1', 12, 'S1-1205', 'Studio', 32.0, 1, 1, 'Bắc', 'Quảng trường lễ hội', 1800000000, 56250000, 'AVAILABLE'],
      ['unit-s2-0810', 'S2', 8, 'S2-0810', '1PN', 42.0, 1, 1, 'Đông', 'Nội khu resort', 2200000000, 52380952, 'HOLD'],
      ['unit-s2-2001', 'S2', 20, 'S2-2001', '3PN', 85.0, 3, 2, 'Tây Bắc', 'Sông Châu Giang', 4800000000, 56470588, 'AVAILABLE'],
    ]
    for (const u of sampleUnits) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO "Unit" (id, buildingCode, floorNumber, unitCode, unitTypeName, area, bedrooms, bathrooms, direction, view, basePrice, pricePerM2, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: u,
      })
    }

    console.log('[db-init] Seeded 5 initial units, policies, and payment plans successfully.')
  } catch (err) {
    console.error('[db-init] Seed error:', err)
  }
}
