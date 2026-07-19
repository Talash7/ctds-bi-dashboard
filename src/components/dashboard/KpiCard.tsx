import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              accent ? 'bg-gold/20 text-gold-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
