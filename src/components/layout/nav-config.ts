import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileBarChart,
  Upload,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react'
import type { AppRole } from '@/contexts/AuthContext'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles?: AppRole[]
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Students', to: '/students', icon: Users },
  { label: 'Programs', to: '/programs', icon: GraduationCap },
  { label: 'Courses', to: '/courses', icon: BookOpen },
  { label: 'Results', to: '/results', icon: ClipboardList },
  { label: 'Reports', to: '/reports', icon: FileBarChart },
  { label: 'AI Chat', to: '/chat', icon: MessageSquare },
  { label: 'Data Import', to: '/import', icon: Upload, roles: ['admin'] },
  { label: 'Users & Roles', to: '/users', icon: ShieldCheck, roles: ['admin'] },
]
