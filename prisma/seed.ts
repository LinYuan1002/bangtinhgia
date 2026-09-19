import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding DEMO DATA...')

  // Xóa data cũ
  await prisma.paymentSchedule.deleteMany()
  await prisma.paymentPlan.deleteMany()
  await prisma.policy.deleteMany()
  await prisma.priceHistory.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.unit.deleteMany()

  // 1. Thêm các căn hộ mẫu
  const units = [
    { building: 'S1', floor: 6, unitCode: 'S1-0612', unitType: '1PN+', area: 45.1, direction: 'Nam', view: 'Công viên', basePrice: 2500000000 },
    { building: 'S1', floor: 6, unitCode: 'S1-0615', unitType: '2PN', area: 60.5, direction: 'Đông Nam', view: 'Hồ bơi', basePrice: 3500000000 },
    { building: 'S1', floor: 12, unitCode: 'S1-1205', unitType: 'Studio', area: 32.0, direction: 'Bắc', view: 'Thành phố', basePrice: 1800000000 },
    { building: 'S2', floor: 8, unitCode: 'S2-0810', unitType: '1PN', area: 42.0, direction: 'Đông', view: 'Nội khu', basePrice: 2200000000 },
    { building: 'S2', floor: 20, unitCode: 'S2-2001', unitType: '3PN', area: 85.0, direction: 'Tây Bắc', view: 'Công viên trung tâm', basePrice: 4800000000 },
  ]
  
  for (const u of units) {
    await prisma.unit.create({ data: u })
  }

  // 2. Thêm chính sách bán hàng mẫu
  const policy1 = await prisma.policy.create({
    data: {
      name: 'Ưu đãi Tháng 10 - Early Bird',
      discountPercent: 5,
      discountAmount: 50000000,
      giftValue: 20000000, // Gói nội thất
      isActive: true,
    }
  })

  const policy2 = await prisma.policy.create({
    data: {
      name: 'Chính sách Vay Ngân Hàng 0%',
      discountPercent: 0,
      bankSupport: true,
      interestRate: 0, // 0%
      loanPeriod: 24, // Hỗ trợ 24 tháng
      isActive: true,
    }
  })

  // 3. Thêm phương án thanh toán
  const standardPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Thanh toán theo tiến độ chuẩn',
      type: 'STANDARD',
      schedules: {
        create: [
          { stepNumber: 1, stepName: 'Đặt cọc', percentValue: 10, timePoint: 'Ngay khi ký TTĐC' },
          { stepNumber: 2, stepName: 'Đợt 1', percentValue: 15, timePoint: 'Ký HĐMB (Sau 15 ngày)' },
          { stepNumber: 3, stepName: 'Đợt 2', percentValue: 15, timePoint: 'T+60 ngày' },
          { stepNumber: 4, stepName: 'Đợt 3', percentValue: 15, timePoint: 'T+120 ngày' },
          { stepNumber: 5, stepName: 'Đợt 4 (Bàn giao)', percentValue: 40, timePoint: 'Thông báo bàn giao nhà' },
          { stepNumber: 6, stepName: 'Đợt 5 (Sổ hồng)', percentValue: 5, timePoint: 'Bàn giao GCNQSDĐ' },
        ]
      }
    }
  })

  const fastPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Thanh toán sớm 95%',
      type: 'FAST',
      schedules: {
        create: [
          { stepNumber: 1, stepName: 'Đặt cọc', percentValue: 10, timePoint: 'Ngay khi ký TTĐC' },
          { stepNumber: 2, stepName: 'Đợt 1', percentValue: 85, timePoint: 'Ký HĐMB (Sau 15 ngày)' },
          { stepNumber: 3, stepName: 'Đợt 2 (Sổ hồng)', percentValue: 5, timePoint: 'Bàn giao GCNQSDĐ' },
        ]
      }
    }
  })

  const loanPlan = await prisma.paymentPlan.create({
    data: {
      name: 'Vay ngân hàng hỗ trợ lãi suất',
      type: 'LOAN',
      schedules: {
        create: [
          { stepNumber: 1, stepName: 'Đặt cọc', percentValue: 10, timePoint: 'Ngay khi ký TTĐC' },
          { stepNumber: 2, stepName: 'Vốn tự có (Đợt 1)', percentValue: 20, timePoint: 'Ký HĐMB (Sau 15 ngày)' },
          { stepNumber: 3, stepName: 'Ngân hàng giải ngân', percentValue: 70, timePoint: 'Trong vòng 15 ngày kể từ Đợt 1' },
        ]
      }
    }
  })

  console.log('Seeded DEMO DATA successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
