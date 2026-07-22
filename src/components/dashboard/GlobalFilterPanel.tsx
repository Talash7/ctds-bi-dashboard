import { Filter as FilterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { Program } from '@/hooks/usePrograms'
import type { UseTabFilters } from '@/hooks/useTabFilters'
import { supportedRuntimeFilters } from '@/lib/dashboard/runtimeFilter'
import { cn } from '@/lib/utils'

const LEVELS = [1, 2, 3]

function programLabel(programId: string | null, programs: Program[]): string {
  if (!programId) return 'All programs'
  return programs.find((p) => p.id === programId)?.name ?? programId
}

/** The Filter button + drawer for one KpiGrid tab — Tier 1 (tab-wide, applies to every
 * filterable kpi at once) at the top, Tier 2 (per-kpi overrides) below. Always visible to
 * every role (unlike Edit Layout, which is admin-only) since day-to-day filtering is meant to
 * happen here instead of through the per-KPI edit dialog. Entirely session-state (see
 * useTabFilters) — nothing here is read from or written to the database. */
export function GlobalFilterPanel({ filters, programs }: { filters: UseTabFilters; programs: Program[] }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="relative">
            <FilterIcon className="size-4" />
            Filter
            {filters.totalActiveCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {filters.totalActiveCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Session-only — these reset the next time you reload the page.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Applies to every KPI{filters.tabWideActiveCount > 0 ? ` (${filters.tabWideActiveCount} active)` : ''}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {filters.tabWideFields.program && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Program</Label>
                  <Select
                    value={filters.tabWide.programId ?? 'all'}
                    onValueChange={(v) => v && filters.setTabWide({ programId: v === 'all' ? null : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v === 'all' ? 'All programs' : programLabel(v, programs))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {filters.tabWideFields.level && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Level</Label>
                  <Select
                    value={filters.tabWide.level != null ? String(filters.tabWide.level) : 'all'}
                    onValueChange={(v) => v && filters.setTabWide({ level: v === 'all' ? null : Number(v) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v === 'all' ? 'All levels' : `Level ${v}`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          Level {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Per-KPI overrides</h3>
            {filters.filterableKpis.length === 0 ? (
              <p className="text-xs text-muted-foreground">No filterable KPIs on this tab.</p>
            ) : (
              <div className="space-y-2.5">
                {filters.filterableKpis.map((kpi) => {
                  const support = supportedRuntimeFilters(kpi.source_table)
                  const override = filters.perKpi[kpi.id]
                  const programOverridden = override?.programId !== undefined && override.programId !== null
                  const levelOverridden = override?.level !== undefined && override.level !== null
                  const hasOverride = programOverridden || levelOverridden
                  return (
                    <div key={kpi.id} className="space-y-2 rounded-lg border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm" dir="auto" title={kpi.label}>
                          <FilterIcon className={cn('size-3 shrink-0', hasOverride ? 'text-primary' : 'text-transparent')} />
                          {kpi.label}
                        </span>
                        {hasOverride && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => filters.clearPerKpi(kpi.id)}>
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {support.program && (
                          <Select
                            value={override?.programId !== undefined ? (override.programId ?? 'all') : 'inherit'}
                            onValueChange={(v) => {
                              if (!v) return
                              filters.setPerKpiOverride(kpi.id, {
                                programId: v === 'inherit' ? undefined : v === 'all' ? null : v,
                              })
                            }}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue>
                                {(v: string) =>
                                  v === 'inherit'
                                    ? `Tab (${programLabel(filters.tabWide.programId, programs)})`
                                    : v === 'all'
                                      ? 'All programs'
                                      : programLabel(v, programs)
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Same as tab-wide</SelectItem>
                              <SelectItem value="all">All programs</SelectItem>
                              {programs.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {support.level && (
                          <Select
                            value={override?.level !== undefined ? (override.level != null ? String(override.level) : 'all') : 'inherit'}
                            onValueChange={(v) => {
                              if (!v) return
                              filters.setPerKpiOverride(kpi.id, {
                                level: v === 'inherit' ? undefined : v === 'all' ? null : Number(v),
                              })
                            }}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue>
                                {(v: string) =>
                                  v === 'inherit'
                                    ? `Tab (${filters.tabWide.level != null ? `Level ${filters.tabWide.level}` : 'All'})`
                                    : v === 'all'
                                      ? 'All levels'
                                      : `Level ${v}`
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Same as tab-wide</SelectItem>
                              <SelectItem value="all">All levels</SelectItem>
                              {LEVELS.map((l) => (
                                <SelectItem key={l} value={String(l)}>
                                  Level {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={filters.clearAll} disabled={filters.totalActiveCount === 0}>
            Clear all
          </Button>
          <SheetClose render={<Button size="sm">Done</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
