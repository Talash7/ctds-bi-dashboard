import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { KpiContext } from '@/lib/dashboard/kpiEngine'

function ProportionBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-primary/10">
      <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
    </div>
  )
}

function BreakdownBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return null
  return (
    <div className="mt-1 flex h-1 w-full overflow-hidden rounded-full bg-primary/10">
      {segments.map((s) => (
        <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} title={s.label} />
      ))}
    </div>
  )
}

const NBSP = ' '
const NON_BREAKING_HYPHEN = '‑'

// Locks a trailing "(...)" qualifier (e.g. "(2+ fails)", "(38-41)") together as one
// unbreakable unit — without this, a label can wrap mid-parenthetical at default card
// width ("2+" / "fails)" on separate lines), which reads as a confusing broken phrase.
// The rest of the label still wraps normally at word boundaries.
function keepParenTogether(label: string): string {
  return label.replace(/\(([^)]*)\)\s*$/, (_match, inner: string) => {
    const locked = inner.replace(/ /g, NBSP).replace(/-/g, NON_BREAKING_HYPHEN)
    return `(${locked})`
  })
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  context,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  accent?: boolean
  context?: KpiContext
}) {
  return (
    <Card size="sm" className="@container h-full">
      <CardContent
        className={cn(
          'flex h-full flex-1 flex-col items-start justify-center gap-0.5 overflow-hidden py-0.5',
          '@[160px]:flex-row @[160px]:items-center @[160px]:justify-between',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] leading-tight text-muted-foreground @[160px]:text-xs @[320px]:text-sm">
            {keepParenTogether(label)}
          </p>
          <p className="truncate text-base leading-tight font-semibold text-foreground @[160px]:text-lg @[220px]:text-xl @[320px]:text-3xl">
            {value}
          </p>
          {context?.type === 'proportion' && <ProportionBar value={context.value} total={context.total} />}
          {context?.type === 'breakdown' && <BreakdownBar segments={context.segments} />}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full @[160px]:size-8',
              accent ? 'bg-gold/20 text-gold-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-3.5 @[160px]:size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
