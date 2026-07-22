import { cn } from '@/lib/utils'

type StatusTone = 'success' | 'gold' | 'danger' | 'neutral'

const EXACT_TONE: Record<string, StatusTone> = {
  Passed: 'success',
  Failed: 'danger',
  Absent: 'neutral',
  A: 'success',
  B: 'success',
  C: 'success',
  D: 'gold',
  F: 'danger',
  Abs: 'neutral',
}

function toneFor(status: string): StatusTone {
  if (status in EXACT_TONE) return EXACT_TONE[status]
  const s = status.toLowerCase()
  if (s.startsWith('graduated')) return 'success'
  if (s.startsWith('probation')) return 'danger'
  if (s.startsWith('active')) return 'gold'
  return 'neutral'
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  gold: 'bg-gold-soft text-foreground border-gold/40',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      dir="auto"
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        toneClasses[toneFor(status)],
        className,
      )}
    >
      {status}
    </span>
  )
}
