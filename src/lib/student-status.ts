export type StatusGroup = 'active' | 'graduated' | 'probation' | 'other'

export function statusGroup(status: string): StatusGroup {
  if (status.startsWith('Active')) return 'active'
  if (status.startsWith('Graduated')) return 'graduated'
  if (status.startsWith('Probation')) return 'probation'
  return 'other'
}
