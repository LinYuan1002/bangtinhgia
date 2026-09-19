import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Căn hộ', href: '/admin/units', icon: '🏢' },
  { label: 'Tòa / Phân khu', href: '/admin/buildings', icon: '🏗️' },
  { label: 'Chính sách CK', href: '/admin/policies', icon: '🏷️' },
  { label: 'Phương án TT', href: '/admin/payment-plans', icon: '📋' },
  { label: 'Chương trình vay', href: '/admin/loan-programs', icon: '🏦' },
  { label: 'Import', href: '/admin/import', icon: '📥' },
  { label: 'Lịch sử giá', href: '/admin/price-history', icon: '📈' },
  { label: 'Báo giá', href: '/admin/quotes', icon: '📄' },
  { label: 'Cài đặt', href: '/admin/settings', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <div className="font-bold text-sm text-blue-400">SUN URBAN CITY</div>
          <div className="text-xs text-slate-400 mt-0.5">Admin Dashboard</div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Về trang chính
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

// NavLink is a client component to detect active state
function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
