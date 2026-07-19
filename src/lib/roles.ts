import type { AppRole } from '@/contexts/AuthContext'

export function canWrite(role: AppRole | null): boolean {
  return role === 'admin' || role === 'registrar'
}
