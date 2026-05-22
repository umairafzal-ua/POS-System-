import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck,
  Wrench, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Bike
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/billing', icon: ShoppingCart, label: 'Billing / POS' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/repairs', icon: Wrench, label: 'Repair Jobs' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout, user } = useAuthStore()

  return (
    <aside
      className={cn(
        'h-full bg-sidebar flex flex-col border-r border-border transition-all duration-300 no-print',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sm font-bold text-foreground truncate">Workshop POS</h1>
            <p className="text-[10px] text-muted truncate">Motor Bike Parts</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-sidebar-active text-primary glow-amber'
                  : 'text-muted hover:text-foreground hover:bg-sidebar-hover'
              )
            }
          >
            <item.icon className={cn('w-5 h-5 shrink-0 transition-transform group-hover:scale-110')} />
            {!collapsed && <span className="truncate animate-fade-in">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-2 border-t border-border pt-3 shrink-0">
        {/* User */}
        {!collapsed && user && (
          <div className="px-3 py-2 animate-fade-in">
            <p className="text-xs font-medium text-foreground truncate">{user.full_name}</p>
            <p className="text-[10px] text-muted capitalize">{user.role}</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-danger-bg transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
