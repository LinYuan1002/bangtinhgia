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
    "groupName" TEXT DEFAULT 'Chính sách chung',
    "applicableBuildings" TEXT DEFAULT 'ALL',
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

    // Migrate columns for Policy if not existing
    try {
      await db.execute('ALTER TABLE "Policy" ADD COLUMN "groupName" TEXT DEFAULT \'Chính sách chung\';')
    } catch {}
    try {
      await db.execute('ALTER TABLE "Policy" ADD COLUMN "applicableBuildings" TEXT DEFAULT \'ALL\';')
    } catch {}

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

    // Seed Building P12 (Quỹ độc quyền) and S1
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Building" (id, projectId, name, code, totalFloors) VALUES (?, ?, ?, ?, ?)`,
      args: ['bld-p12', 'proj-suc', 'Tòa P12 (Quỹ Độc Quyền)', 'P12', 29],
    })
    await db.execute({
      sql: `INSERT OR IGNORE INTO "Building" (id, projectId, name, code, totalFloors) VALUES (?, ?, ?, ?, ?)`,
      args: ['bld-s1', 'proj-suc', 'Tòa S1', 'S1', 25],
    })

    // Seed CSBH T9/2026 Policies
    const realPolicies = [
      ['policy-eb-1', 'Early Bird (EB) - Chiết khấu 1%', 'Chiết khấu 1% trực tiếp vào giá bán niêm yết', 1, 0, 0, 0, 'SEQUENTIAL', 'ACTIVE', 1, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-khong-vay-5', 'Không vay ngân hàng - Chiết khấu 5%', 'Chiết khấu 5% vào giá bán cho khách hàng thanh toán bằng vốn tự có', 5, 0, 0, 0, 'SEQUENTIAL', 'ACTIVE', 2, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-blnh-1', 'Không nhận chứng thư BLNH - Chiết khấu 1%', 'Chiết khấu 1% tạm tính cho khách hàng không nhận bảo lãnh ngân hàng', 1, 0, 0, 0, 'SEQUENTIAL', 'ACTIVE', 3, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-tts-95', 'Thanh toán sớm 95% (Đến 25/09/2026) - CK 9.5%', 'Chiết khấu 9.5% khi hoàn thành thanh toán sớm 95% muộn nhất 25/09/2026', 9.5, 0, 9.5, 0, 'SEQUENTIAL', 'ACTIVE', 4, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-tts-70', 'Thanh toán sớm 70% (Đến 25/09/2026) - CK 4.5%', 'Chiết khấu 4.5% khi hoàn thành thanh toán sớm 70% muộn nhất 25/09/2026', 4.5, 0, 4.5, 0, 'SEQUENTIAL', 'ACTIVE', 5, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-tts-50', 'Thanh toán sớm 50% (Đến 25/09/2026) - CK 1.5%', 'Chiết khấu 1.5% khi hoàn thành thanh toán sớm 50% muộn nhất 25/09/2026', 1.5, 0, 1.5, 0, 'SEQUENTIAL', 'ACTIVE', 6, 'CSBH T9/2026 - Quỹ Độc Quyền', 'P12'],
      ['policy-s1-eb', 'Ưu đãi Khách hàng thân thiết Tòa S1, S2', 'Chiết khấu 2% tri ân khách hàng thân thiết Sun Group', 2, 0, 0, 0, 'STACKED', 'ACTIVE', 1, 'CSBH Mở Bán Tòa S1 - S2', 'S1,S2'],
      ['policy-s1-gift', 'Gói quà tặng nội thất cao cấp S1, S2', 'Tặng gói voucher nội thất trị giá 30 triệu đồng', 0, 0, 0, 30000000, 'STACKED', 'ACTIVE', 2, 'CSBH Mở Bán Tòa S1 - S2', 'S1,S2'],
    ]
    for (const p of realPolicies) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "Policy" (id, name, description, discountPercent, fixedDiscount, earlyPaymentDiscountPct, giftValue, discountMode, status, priority, groupName, applicableBuildings)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: p,
      })
    }

    // Seed Payment Plans
    await db.execute({
      sql: `INSERT OR REPLACE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-tts-95', 'Thanh toán sớm 95% (Hạn 25/09/2026)', 'FAST', 'Thanh toán 95% muộn nhất ngày 25/09/2026 hưởng chiết khấu 9.5%', 1],
    })
    const tts95Schedules = [
      ['plan-tts-95', 1, 'Đặt cọc (Studio 50tr, 1BR+ 100tr, 2BR 150tr)', 5, 'Ngay khi ký TTĐC'],
      ['plan-tts-95', 2, 'Đợt 1 (Ký HĐMB & TT 95%)', 90, 'Muộn nhất ngày 25/09/2026'],
      ['plan-tts-95', 3, 'Đợt 2 (Bàn giao GCN / Sổ)', 5, 'Khi nhận sổ hồng'],
    ]
    for (const s of tts95Schedules) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-tts95-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-tts-70', 'Thanh toán sớm 70% (Hạn 25/09/2026)', 'FAST', 'Thanh toán 70% muộn nhất ngày 25/09/2026 hưởng chiết khấu 4.5%', 1],
    })
    const tts70Schedules = [
      ['plan-tts-70', 1, 'Đặt cọc', 5, 'Ngay khi ký TTĐC'],
      ['plan-tts-70', 2, 'Đợt 1 (Ký HĐMB & TT 70%)', 65, 'Muộn nhất ngày 25/09/2026'],
      ['plan-tts-70', 3, 'Đợt 2 (Bàn giao căn hộ)', 25, 'Khi nhận bàn giao nhà'],
      ['plan-tts-70', 4, 'Đợt 3 (Bàn giao GCN / Sổ)', 5, 'Khi nhận sổ hồng'],
    ]
    for (const s of tts70Schedules) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-tts70-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-tts-50', 'Thanh toán sớm 50% (Hạn 25/09/2026)', 'FAST', 'Thanh toán 50% muộn nhất ngày 25/09/2026 hưởng chiết khấu 1.5%', 1],
    })
    const tts50Schedules = [
      ['plan-tts-50', 1, 'Đặt cọc', 5, 'Ngay khi ký TTĐC'],
      ['plan-tts-50', 2, 'Đợt 1 (Ký HĐMB & TT 50%)', 45, 'Muộn nhất ngày 25/09/2026'],
      ['plan-tts-50', 3, 'Đợt 2 (Bàn giao căn hộ)', 45, 'Khi nhận bàn giao nhà'],
      ['plan-tts-50', 4, 'Đợt 3 (Bàn giao GCN / Sổ)', 5, 'Khi nhận sổ hồng'],
    ]
    for (const s of tts50Schedules) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-tts50-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-std', 'Tiến độ thanh toán chuẩn (Không vay)', 'STANDARD', 'Thanh toán giãn đều theo tiến độ thi công', 1],
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
        sql: `INSERT OR REPLACE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-std-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    // Seed Loan Plan
    await db.execute({
      sql: `INSERT OR REPLACE INTO "PaymentPlan" (id, name, type, description, isActive) VALUES (?, ?, ?, ?, ?)`,
      args: ['plan-loan', 'Phương án Vay Ngân Hàng 70% (HTLS 0%)', 'LOAN', 'Hỗ trợ lãi suất 0% và ân hạn nợ gốc', 1],
    })
    const loanSchedules = [
      ['plan-loan', 1, 'Đặt cọc (Vốn tự có)', 10, 'Ngay khi ký TTĐC'],
      ['plan-loan', 2, 'Đợt 1 - Vốn tự có (Ký HĐMB)', 20, 'Trong 15 ngày'],
      ['plan-loan', 3, 'Đợt 2 - Ngân hàng giải ngân', 70, 'Sau 15 ngày kể từ HĐMB'],
    ]
    for (const s of loanSchedules) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "PaymentScheduleItem" (id, paymentPlanId, stepNumber, name, percentage, dueDateNote) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [`item-loan-${s[1]}`, s[0], s[1], s[2], s[3], s[4]],
      })
    }

    // Seed Loan Programs
    await db.execute({
      sql: `INSERT OR REPLACE INTO "LoanProgram" (id, name, bankName, annualInterestRate, interestRateType, maxLoanPercent, maxLoanTermMonths, repaymentMethod, interestSupport, supportRate, supportPeriodMonths, status)
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

    // Seed 15 Real Units of Quỹ Độc Quyền P12
    const p12Units = [
      ['unit-p12-03a02', 'P12', 3, 'P1203A02', 'Studio', 30.5, 1, 1, 'Tây', 'đường 36m', 1577154839, Math.round(1577154839 / 30.5), 'AVAILABLE'],
      ['unit-p12-03a03', 'P12', 3, 'P1203A03', '1BR+', 46.8, 1, 1, 'Tây', 'đường 36m', 2267461407, Math.round(2267461407 / 46.8), 'AVAILABLE'],
      ['unit-p12-03a09', 'P12', 3, 'P1203A09', '2BR', 54.5, 2, 2, 'Đông - Bắc', 'Góc Sun World', 3152171397, Math.round(3152171397 / 54.5), 'AVAILABLE'],
      ['unit-p12-03a15', 'P12', 3, 'P1203A15', '1BR+', 46.7, 1, 1, 'Đông', 'View nội khu', 2136346657, Math.round(2136346657 / 46.7), 'AVAILABLE'],
      ['unit-p12-0501', 'P12', 5, 'P120501', 'Studio', 30.5, 1, 1, 'Tây', 'đường 36m', 1592387825, Math.round(1592387825 / 30.5), 'AVAILABLE'],
      ['unit-p12-0512', 'P12', 5, 'P120512', '1BR+', 46.6, 1, 1, 'Đông', 'View sun world', 2152294426, Math.round(2152294426 / 46.6), 'AVAILABLE'],
      ['unit-p12-0518', 'P12', 5, 'P120518', '2BR', 54.6, 2, 2, 'Đông - Nam', 'Góc + Nội Khu', 2707630656, Math.round(2707630656 / 54.6), 'AVAILABLE'],
      ['unit-p12-0524', 'P12', 5, 'P120524', '1BR+', 46.6, 1, 1, 'Tây', 'đường 36m', 2279541308, Math.round(2279541308 / 46.6), 'AVAILABLE'],
      ['unit-p12-0605', 'P12', 6, 'P120605', '1BR+', 46.6, 1, 1, 'Tây', 'CV thể thao', 2301311211, Math.round(2301311211 / 46.6), 'AVAILABLE'],
      ['unit-p12-0611', 'P12', 6, 'P120611', '1BR+', 46.6, 1, 1, 'Đông', 'View sun world', 2172816812, Math.round(2172816812 / 46.6), 'AVAILABLE'],
      ['unit-p12-0621', 'P12', 6, 'P120621', 'Studio', 30.5, 1, 1, 'Tây', 'đường 36m', 1639641174, Math.round(1639641174 / 30.5), 'AVAILABLE'],
      ['unit-p12-0622', 'P12', 6, 'P120622', '1BR+', 46.7, 1, 1, 'Tây', 'đường 36m', 2306249647, Math.round(2306249647 / 46.7), 'AVAILABLE'],
      ['unit-p12-0907', 'P12', 9, 'P120907', 'Studio', 30.6, 1, 1, 'Tây', 'CV thể thao', 1719057358, Math.round(1719057358 / 30.6), 'AVAILABLE'],
      ['unit-p12-0912a', 'P12', 9, 'P120912A', '1BR+', 46.8, 1, 1, 'Đông', 'View nội khu', 2096435649, Math.round(2096435649 / 46.8), 'AVAILABLE'],
      ['unit-p12-0923', 'P12', 9, 'P120923', '1BR+', 46.9, 1, 1, 'Tây', 'đường 36m', 2338036574, Math.round(2338036574 / 46.9), 'AVAILABLE'],
    ]
    for (const u of p12Units) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO "Unit" (id, buildingCode, floorNumber, unitCode, unitTypeName, area, bedrooms, bathrooms, direction, view, basePrice, pricePerM2, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: u,
      })
    }

    console.log('[db-init] Seeded 15 P12 exclusive units and CSBH T9/2026 policies successfully.')
  } catch (err) {
    console.error('[db-init] Seed error:', err)
  }
}

/**
 * Explicitly forces seeding of the 15 P12 units and CSBH T9/2026 into the database.
 */
export async function seedP12ExclusiveInventory(client?: Client) {
  const db = client || getTursoClient()
  if (!db) return { success: false, message: 'Chưa có kết nối Turso' }

  // Clean old sample units
  const sampleCodes = ['S1-0612', 'S1-0615', 'S1-1205', 'S2-0810', 'S2-2001']
  for (const code of sampleCodes) {
    await db.execute({ sql: `DELETE FROM "Unit" WHERE "unitCode" = ?`, args: [code] }).catch(() => {})
  }

  // Execute seeding
  await seedInitialDataIfEmpty(db)
  return { success: true, message: 'Đã nạp thành công 15 căn hộ Quỹ Độc Quyền Tòa P12 và CSBH T9/2026 lên Database!' }
}
