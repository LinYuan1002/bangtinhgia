import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding DEMO DATA for Phase 2...')

  // Clean all existing data
  await prisma.importRow.deleteMany()
  await prisma.importBatch.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.priceHistory.deleteMany()
  await prisma.paymentScheduleItem.deleteMany()
  await prisma.paymentPlan.deleteMany()
  await prisma.policy.deleteMany()
  await prisma.loanProgram.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.floor.deleteMany()
  await prisma.building.deleteMany()
  await prisma.unitType.deleteMany()
  await prisma.project.deleteMany()
  await prisma.setting.deleteMany()

  // 1. Settings
  await prisma.setting.create({
    data: {
      key: 'discount_calculation_mode',
      value: 'STACKED',
      label: 'Phương thức tính chiết khấu (STACKED / SEQUENTIAL)',
    },
  })

  // 2. Project
  const project = await prisma.project.create({
    data: {
      name: 'Sun Urban City Hà Nam',
      code: 'SUC',
      description: 'Đại đô thị nghỉ dưỡng ngoại ô phía Nam Hà Nội',
      isActive: true,
    },
  })

  // 3. Buildings
  const s1 = await prisma.building.create({
    data: {
      projectId: project.id,
      name: 'Tòa Park 1 (S1)',
      code: 'S1',
      totalFloors: 25,
    },
  })

  const s2 = await prisma.building.create({
    data: {
      projectId: project.id,
      name: 'Tòa Park 2 (S2)',
      code: 'S2',
      totalFloors: 25,
    },
  })

  // 4. Units
  const sampleUnits = [
    { buildingCode: 'S1', floorNumber: 6, unitCode: 'S1-0612', unitTypeName: '1PN+', area: 45.1, bedrooms: 1, bathrooms: 1, direction: 'Nam', view: 'Công viên trung tâm', basePrice: 2500000000, status: 'AVAILABLE' },
    { buildingCode: 'S1', floorNumber: 6, unitCode: 'S1-0615', unitTypeName: '2PN', area: 60.5, bedrooms: 2, bathrooms: 2, direction: 'Đông Nam', view: 'Hồ bơi sinh thái', basePrice: 3500000000, status: 'AVAILABLE' },
    { buildingCode: 'S1', floorNumber: 12, unitCode: 'S1-1205', unitTypeName: 'Studio', area: 32.0, bedrooms: 0, bathrooms: 1, direction: 'Bắc', view: 'Quảng trường lễ hội', basePrice: 1800000000, status: 'AVAILABLE' },
    { buildingCode: 'S2', floorNumber: 8, unitCode: 'S2-0810', unitTypeName: '1PN', area: 42.0, bedrooms: 1, bathrooms: 1, direction: 'Đông', view: 'Nội khu resort', basePrice: 2200000000, status: 'HOLD' },
    { buildingCode: 'S2', floorNumber: 20, unitCode: 'S2-2001', unitTypeName: '3PN', area: 85.0, bedrooms: 3, bathrooms: 2, direction: 'Tây Bắc', view: 'Sông Châu Giang', basePrice: 4800000000, status: 'AVAILABLE' },
  ]

  for (const u of sampleUnits) {
    const pricePerM2 = u.area > 0 ? u.basePrice / u.area : 0
    await prisma.unit.create({
      data: {
        ...u,
        pricePerM2,
        projectId: project.id,
        buildingId: u.buildingCode === 'S1' ? s1.id : s2.id,
      },
    })
  }

  // 5. Policies
  await prisma.policy.create({
    data: {
      projectId: project.id,
      name: 'Chính sách Mở Bán Đợt 1 - Early Bird',
      description: 'Chiết khấu 5% giá trị căn hộ + quà tặng nội thất 20tr',
      discountPercent: 5,
      giftValue: 20000000,
      discountMode: 'STACKED',
      status: 'ACTIVE',
      priority: 1,
    },
  })

  await prisma.policy.create({
    data: {
      projectId: project.id,
      name: 'Chính sách Thanh Toán Sớm 95%',
      description: 'Chiết khấu bổ sung 8% khi thanh toán sớm 95% trong 15 ngày',
      discountPercent: 8,
      earlyPaymentDiscountPct: 3,
      discountMode: 'STACKED',
      status: 'ACTIVE',
      priority: 2,
    },
  })

  // 6. Payment Plans
  const standardPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Tiến độ thanh toán chuẩn (6 đợt)',
      type: 'STANDARD',
      description: 'Thanh toán linh hoạt theo tiến độ xây dựng',
      isActive: true,
      scheduleItems: {
        create: [
          { stepNumber: 1, name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC', relativeDays: 0 },
          { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB)', percentage: 15, dueDateNote: 'Sau 15 ngày kể từ TTĐC', relativeDays: 15 },
          { stepNumber: 3, name: 'Đợt 2', percentage: 15, dueDateNote: 'T+60 ngày', relativeDays: 60 },
          { stepNumber: 4, name: 'Đợt 3', percentage: 15, dueDateNote: 'T+120 ngày', relativeDays: 120 },
          { stepNumber: 5, name: 'Đợt 4 (Bàn giao nhà)', percentage: 40, dueDateNote: 'Khi có thông báo bàn giao', relativeDays: 240 },
          { stepNumber: 6, name: 'Đợt 5 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Khi bàn giao sổ hồng', relativeDays: 360 },
        ],
      },
    },
  })

  const fastPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Thanh toán sớm 95%',
      type: 'FAST',
      description: 'Hưởng chiết khấu cao nhất khi thanh toán ngay',
      isActive: true,
      scheduleItems: {
        create: [
          { stepNumber: 1, name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC', relativeDays: 0 },
          { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 85%)', percentage: 85, dueDateNote: 'Trong 15 ngày kể từ cọc', relativeDays: 15 },
          { stepNumber: 3, name: 'Đợt 2 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Khi bàn giao sổ hồng', relativeDays: 360 },
        ],
      },
    },
  })

  const loanPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Phương án Vay Ngân Hàng 70%',
      type: 'LOAN',
      description: 'Vốn tự có 30%, Ngân hàng hỗ trợ giải ngân 70%',
      isActive: true,
      scheduleItems: {
        create: [
          { stepNumber: 1, name: 'Đặt cọc (Vốn tự có)', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC', relativeDays: 0 },
          { stepNumber: 2, name: 'Đợt 1 - Vốn tự có (Ký HĐMB)', percentage: 20, dueDateNote: 'Trong 15 ngày', relativeDays: 15 },
          { stepNumber: 3, name: 'Đợt 2 - Ngân hàng giải ngân', percentage: 70, dueDateNote: 'Sau 15 ngày kể từ HĐMB', relativeDays: 30 },
        ],
      },
    },
  })

  // 7. Loan Programs
  await prisma.loanProgram.create({
    data: {
      projectId: project.id,
      name: 'Gói vay Vietcombank - HTLS 0% 18 tháng',
      bankName: 'Vietcombank',
      annualInterestRate: 8.5,
      interestRateType: 'FIXED',
      maxLoanPercent: 70,
      maxLoanTermMonths: 240, // 20 năm
      repaymentMethod: 'EQUAL_PAYMENT',
      interestSupport: true,
      supportRate: 0, // 0%
      supportPeriodMonths: 18,
      status: 'ACTIVE',
      notes: 'Ân hạn nợ gốc trong thời gian hỗ trợ lãi suất',
    },
  })

  await prisma.loanProgram.create({
    data: {
      projectId: project.id,
      name: 'Gói vay MB Bank - Ưu đãi 6.5% năm đầu',
      bankName: 'MB Bank',
      annualInterestRate: 8.9,
      interestRateType: 'VARIABLE',
      maxLoanPercent: 80,
      maxLoanTermMonths: 300, // 25 năm
      repaymentMethod: 'EQUAL_PRINCIPAL',
      interestSupport: true,
      supportRate: 6.5,
      supportPeriodMonths: 12,
      status: 'ACTIVE',
      notes: 'Phương thức dư nợ giảm dần, biên độ sau ưu đãi = LSTK 12T + 3.5%',
    },
  })

  console.log('Seeded Phase 2 DEMO DATA successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
