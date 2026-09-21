export const FALLBACK_FOLDERS = [
  {
    id: 'folder-p12',
    name: 'CSBH Tòa P12 - Quỹ Độc Quyền',
    description: 'Chính sách bán hàng ưu đãi dành riêng cho Tòa P12',
    applicableBuildings: 'P12',
    status: 'ACTIVE',
    priority: 1,
  },
]

export const FALLBACK_PLANS = [
  {
    id: 'plan-tts-95',
    name: 'Thanh toán sớm 95% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 9.5% khi hoàn thành thanh toán 95% trước 25/09/2026',
    isActive: true,
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc (Studio 50tr, 1BR+ 100tr, 2BR 150tr)', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 95%)', percentage: 90, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-tts-70',
    name: 'Thanh toán sớm 70% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 4.5% khi thanh toán đủ 70% trước 25/09/2026',
    isActive: true,
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 70%)', percentage: 65, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao căn hộ)', percentage: 25, dueDateNote: 'Khi nhận bàn giao nhà' },
      { stepNumber: 4, name: 'Đợt 3 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-tts-50',
    name: 'Thanh toán sớm 50% (Hạn 25/09/2026)',
    type: 'FAST',
    description: 'Hưởng chiết khấu 1.5% khi thanh toán đủ 50% trước 25/09/2026',
    isActive: true,
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 5, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB & TT 50%)', percentage: 45, dueDateNote: 'Muộn nhất ngày 25/09/2026' },
      { stepNumber: 3, name: 'Đợt 2 (Bàn giao căn hộ)', percentage: 45, dueDateNote: 'Khi nhận bàn giao nhà' },
      { stepNumber: 4, name: 'Đợt 3 (Bàn giao GCN / Sổ)', percentage: 5, dueDateNote: 'Khi nhận sổ hồng' },
    ],
  },
  {
    id: 'plan-std',
    name: 'Tiến độ thanh toán chuẩn (Không vay)',
    type: 'STANDARD',
    description: 'Thanh toán giãn đều theo tiến độ thi công',
    isActive: true,
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 (Ký HĐMB)', percentage: 15, dueDateNote: 'Sau 15 ngày kể từ TTĐC' },
      { stepNumber: 3, name: 'Đợt 2', percentage: 15, dueDateNote: 'T+60 ngày' },
      { stepNumber: 4, name: 'Đợt 3', percentage: 15, dueDateNote: 'T+120 ngày' },
      { stepNumber: 5, name: 'Đợt 4 (Bàn giao nhà)', percentage: 40, dueDateNote: 'Khi có thông báo bàn giao' },
      { stepNumber: 6, name: 'Đợt 5 (Cấp GCN / Sổ)', percentage: 5, dueDateNote: 'Khi bàn giao sổ hồng' },
    ],
  },
  {
    id: 'plan-loan',
    name: 'Phương án Vay Ngân Hàng 70% (HTLS 0%)',
    type: 'LOAN',
    description: 'Hỗ trợ lãi suất 0% và ân hạn nợ gốc',
    isActive: true,
    scheduleItems: [
      { stepNumber: 1, name: 'Đặt cọc (Vốn tự có)', percentage: 10, dueDateNote: 'Ngay khi ký TTĐC' },
      { stepNumber: 2, name: 'Đợt 1 - Vốn tự có (Ký HĐMB)', percentage: 20, dueDateNote: 'Trong 15 ngày' },
      { stepNumber: 3, name: 'Đợt 2 - Ngân hàng giải ngân', percentage: 70, dueDateNote: 'Sau 15 ngày kể từ HĐMB' },
    ],
  },
]
