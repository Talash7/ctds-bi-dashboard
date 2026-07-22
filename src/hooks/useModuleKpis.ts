import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { ModuleKpi } from '@/lib/dashboard/kpiEngine'
import type { Json } from '@/types/database.types'

export interface ModuleKpiWithSource extends ModuleKpi {
  source_table: string
}

export interface KpiLayoutUpdate {
  id: string
  grid_x: number
  grid_y: number
  grid_w: number
  grid_h: number
}

export function useModuleKpis(targetPage: string) {
  const [kpis, setKpis] = useState<ModuleKpiWithSource[]>([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const { data } = await supabase
      .from('module_kpis')
      .select('*, modules!inner(source_table, enabled)')
      .eq('target_page', targetPage)
      .eq('enabled', true)
      .eq('modules.enabled', true)
      .order('sort_order')
    setKpis(
      (data ?? []).map((row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { modules, ...rest } = row as any
        return { ...rest, source_table: modules.source_table }
      }),
    )
    loadedOnce.current = true
    setLoading(false)
  }, [targetPage])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Debounced so a burst of realtime row-change events (e.g. from a bulk layout update)
  // collapses into one refetch instead of re-syncing once per event — a rapid staggered
  // sequence of partial refetches was what made Save/Reset visibly shake mid-update.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(refetch, 150)
  }, [refetch])
  useRealtimeTable('module_kpis', debouncedRefetch)

  const saveLayout = useCallback(
    async (updates: KpiLayoutUpdate[]) => {
      // One statement for every row instead of N separate awaited requests — see the
      // bulk_update_kpi_layout RPC's comment for why that staggering caused visible shaking.
      await supabase.rpc('bulk_update_kpi_layout', { p_updates: updates as unknown as Json })
      await refetch()
    },
    [refetch],
  )

  const disableKpi = useCallback(
    async (id: string) => {
      await supabase.from('module_kpis').update({ enabled: false }).eq('id', id)
      await refetch()
    },
    [refetch],
  )

  const updateKpi = useCallback(
    async (id: string, patch: Partial<ModuleKpi>) => {
      await supabase.from('module_kpis').update(patch).eq('id', id)
      await refetch()
    },
    [refetch],
  )

  const createHeader = useCallback(
    async (label: string): Promise<{ id: string } | null> => {
      // module_id is a required FK but headers carry no data source — any enabled
      // module works, the display_type: 'header' renderer ignores it entirely.
      const { data: anyModule } = await supabase.from('modules').select('id').eq('enabled', true).limit(1).maybeSingle()
      if (!anyModule) return null
      const nextSort = (kpis.at(-1)?.sort_order ?? 0) + 1
      const { data: created } = await supabase
        .from('module_kpis')
        .insert({
          module_id: anyModule.id,
          label,
          aggregation: 'custom',
          format: 'number',
          target_page: targetPage,
          display_type: 'header',
          grid_x: null,
          grid_y: null,
          grid_w: 24,
          grid_h: 3,
          sort_order: nextSort,
        })
        .select('id')
        .single()
      await refetch()
      return created
    },
    [targetPage, kpis, refetch],
  )

  const resetToDefault = useCallback(async () => {
    // Restores the canonical "shipped" layout captured in default_grid_x/y/w/h (see the
    // add_and_populate_kpi_default_layout / redesign_dashboard_results_default_layout
    // migrations) — a fixed snapshot, independent of whatever's been saved since, so this
    // stays meaningfully different from "Reset" (last saved). A handful of section headers
    // (e.g. "Standard KPIs"/"Deep Insights") are themselves part of that canonical layout —
    // identified by having a non-null default_grid_x, same as any other default row — and
    // get restored/repositioned right along with everything else. Any other header is purely
    // ad hoc customization (default_grid_x is null) and gets removed. KPI/chart/panel enable
    // state is untouched — deletion is a separate, deliberate action.
    // Runs entirely as one server-side statement pair (reset_kpi_layout_to_default RPC)
    // instead of a client-side fetch-then-loop-of-updates — see bulk_update_kpi_layout's
    // comment for why per-row round trips caused visible shaking on this page.
    await supabase.rpc('reset_kpi_layout_to_default', { p_target_page: targetPage })
    await refetch()
  }, [targetPage, refetch])

  const saveCurrentAsDefault = useCallback(async () => {
    // Copies every enabled row's live grid_x/y/w/h into default_grid_x/y/w/h for this
    // page only — the same columns resetToDefault reads from — so "Reset to Default"
    // starts producing this arrangement instead of whatever shipped before. Caller is
    // expected to have already persisted the current layout via saveLayout first, so
    // grid_x/y/w/h here really is what's on screen, not a stale in-progress edit.
    await supabase.rpc('save_current_layout_as_default', { p_target_page: targetPage })
    await refetch()
  }, [targetPage, refetch])

  return { kpis, loading, saveLayout, disableKpi, updateKpi, createHeader, resetToDefault, saveCurrentAsDefault }
}
