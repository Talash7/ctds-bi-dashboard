import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { navItems } from './nav-config'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6">
        <p className="text-sm font-semibold tracking-wide text-sidebar-foreground">CTDS</p>
        <p className="text-xs text-sidebar-foreground/70">BI Dashboard</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems
          .filter((item) => !item.roles || (role && item.roles.includes(role)))
          .map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
      </nav>
    </div>
  )
}
