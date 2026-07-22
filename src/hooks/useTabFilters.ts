import { useCallback, useMemo, useState } from 'react'
import type { ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import { EMPTY_RUNTIME_FILTER, isRuntimeFilterActive, supportedRuntimeFilters, type RuntimeFilter } from '@/lib/dashboard/runtimeFilter'

// A per-kpi override — `undefined` on a field means "inherit the tab-wide value for that
// field," `null` means "explicitly All/no filter for this one kpi, regardless of tab-wide."
export interface PerKpiOverride {
  programId?: string | null
  level?: number | null
}

// Which fields the tab-wide (Tier 1) row offers — a fixed, per-page list from the brief
// (e.g. Courses/Programs only ever show a tab-wide Program control, never Level), independent
// of what any individual kpi on that page auto-detects for its own per-kpi (Tier 2) options.
export interface TabWideFields {
  program: boolean
  level: boolean
}

/** Session-only (never persisted — resets on reload simply by being plain useState), two-tier
 * filter state for one KpiGrid tab. Tier 1 (tabWide) applies to every filterable kpi at once;
 * Tier 2 (perKpi) overrides/narrows it for one specific kpi at a time; an unset per-kpi field
 * falls back to the tab-wide value, per the brief's stacking rule. */
export function useTabFilters(kpis: ModuleKpiWithSource[], tabWideFields: TabWideFields) {
  const [tabWide, setTabWideState] = useState<RuntimeFilter>(EMPTY_RUNTIME_FILTER)
  const [perKpi, setPerKpi] = useState<Record<string, PerKpiOverride>>({})

  const setTabWide = useCallback((patch: Partial<RuntimeFilter>) => {
    setTabWideState((prev) => ({ ...prev, ...patch }))
  }, [])

  const setPerKpiOverride = useCallback((kpiId: string, patch: Partial<PerKpiOverride>) => {
    setPerKpi((prev) => ({ ...prev, [kpiId]: { ...prev[kpiId], ...patch } }))
  }, [])

  const clearPerKpi = useCallback((kpiId: string) => {
    setPerKpi((prev) => {
      if (!(kpiId in prev)) return prev
      const next = { ...prev }
      delete next[kpiId]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setTabWideState(EMPTY_RUNTIME_FILTER)
    setPerKpi({})
  }, [])

  // Every filterable kpi (auto-detected from source_table), skipping headers/panels/anything
  // that can't sensibly be row-filtered.
  const filterableKpis = useMemo(
    () =>
      kpis.filter((k) => {
        if (k.display_type === 'header') return false
        const support = supportedRuntimeFilters(k.source_table)
        return support.program || support.level
      }),
    [kpis],
  )

  const resolvedByKpi = useMemo(() => {
    const map: Record<string, RuntimeFilter> = {}
    for (const k of kpis) {
      const override = perKpi[k.id]
      map[k.id] = {
        programId: override?.programId !== undefined ? override.programId : tabWide.programId,
        level: override?.level !== undefined ? override.level : tabWide.level,
      }
    }
    return map
  }, [kpis, perKpi, tabWide])

  const tabWideActiveCount = (tabWide.programId != null ? 1 : 0) + (tabWide.level != null ? 1 : 0)
  const perKpiActiveCount = Object.values(perKpi).filter(
    (o) => (o.programId !== undefined && o.programId !== null) || (o.level !== undefined && o.level !== null),
  ).length
  const totalActiveCount = tabWideActiveCount + perKpiActiveCount

  return {
    tabWide,
    setTabWide,
    perKpi,
    setPerKpiOverride,
    clearPerKpi,
    clearAll,
    filterableKpis,
    tabWideFields,
    resolvedByKpi,
    tabWideActiveCount,
    totalActiveCount,
    isActive: isRuntimeFilterActive,
  }
}

export type UseTabFilters = ReturnType<typeof useTabFilters>
