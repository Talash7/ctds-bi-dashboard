import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import ReactGridLayout, { noCompactor, type Layout, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { BookmarkPlus, Heading, Move, Pencil, RotateCcw, Save, Settings2, Undo2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { KpiEditDialog } from '@/components/dashboard/KpiEditDialog'
import { BreakdownKpiCard, GenericKpiChart } from '@/components/dashboard/DashboardCharts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useModuleKpis, type ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import type { Program } from '@/hooks/usePrograms'
import type { UseTabFilters } from '@/hooks/useTabFilters'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  chartCategoryDimension,
  computeBreakdownData,
  computeChartData,
  computeKpiValue,
  formatKpiValue,
  type BreakdownValue,
  type ChartValue,
  type CustomValue,
} from '@/lib/dashboard/kpiEngine'
import { applyRuntimeFilter } from '@/lib/dashboard/runtimeFilter'
import { MODULE_ICONS } from '@/lib/dashboard/moduleIcons'
import { GlobalFilterPanel } from '@/components/dashboard/GlobalFilterPanel'

const COLUMNS = 24
// A small row-height unit gives resize handles fine-grained steps (10px per row) instead
// of only 2-3 usable heights. Grid units are 5x finer than the original 50px rows — all
// height-related defaults/minimums below (and the DB's existing grid_h/grid_y values, via
// a one-time migration) are scaled ×5 to preserve prior visual sizing at the new unit.
const ROW_HEIGHT = 10
const MARGIN: [number, number] = [14, 8]

// No automatic compaction (no vertical "pull everything up to close gaps" pass — that
// made shrinking a card also yank its neighbor up), and no collision push either
// (allowOverlap: true) — dragging or resizing a KPI card/chart onto another one just lets
// them overlap visually, nothing else recalculates. Earlier attempts at real-time collision
// resolution (single-hop, then a column-confined cascade, both gated by an overlap-area
// threshold) were the actual cause of the "shaking" freeze: recalculating every affected
// item's position on every pixel of movement, with resolution logic that could produce a
// new collision as a side effect of resolving one, has no guaranteed exit condition. This
// removes that class of bug entirely rather than continuing to tune it — the only
// remaining custom logic is the header "push everything below down" behavior below, and
// it runs exactly once, on drop, never during live movement.
const COMPACTOR = { ...noCompactor, allowOverlap: true }

// Charts/panels default to a bigger size than KPI cards (see defaultSize below) since they
// usually need real room to read well, but resizing one down is a deliberate choice the
// person is making — down to fitting a small gap, cramped axis labels/legend and all — so
// the floor here matches KPI cards' instead of blocking it with a large fixed minimum.
function minSize(k: ModuleKpiWithSource): { minW: number; minH: number } {
  if (k.display_type === 'header') return { minW: 4, minH: 3 }
  return { minW: 2, minH: 5 }
}

function defaultSize(k: ModuleKpiWithSource): { w: number; h: number } {
  if (k.display_type === 'header') return { w: k.grid_w || COLUMNS, h: k.grid_h || 3 }
  if (k.display_type === 'number') return { w: k.grid_w || 4, h: k.grid_h || 10 }
  // A compound top-line-plus-segments card reads best a bit wider/taller than a plain number
  // card (room for the sub-value row) but doesn't need a full chart-panel footprint.
  if (k.display_type === 'breakdown') return { w: k.grid_w || 6, h: k.grid_h || 14 }
  if ((k.grid_w ?? 12) <= 6) return { w: k.grid_w || 4, h: k.grid_h || 10 }
  return { w: Math.max(k.grid_w || 8, 6), h: Math.max(k.grid_h || 30, 20) }
}

// Shelf-pack items that have never been positioned (grid_x/y null) into a sensible
// reading-order default. Once a layout is saved, every item has explicit coordinates
// and this is skipped entirely in favor of the real saved positions.
function packLayout(kpis: ModuleKpiWithSource[]): LayoutItem[] {
  let cursorX = 0
  let cursorY = 0
  let rowMaxH = 0
  return kpis.map((k) => {
    // A previously-saved item's w/h must come straight from what was saved — routing it
    // through defaultSize() here re-derives a size from heuristics (e.g. "width > 6 cols
    // means treat height as unset, clamp to >= 20") meant only for genuinely-new items.
    // That clamp was silently overriding an intentionally-shrunk height back up the
    // instant a person widened the same chart past 6 columns, since defaultSize has no
    // way to tell "saved small on purpose" apart from "never configured."
    if (k.grid_x != null && k.grid_y != null && k.grid_w != null && k.grid_h != null) {
      return { i: k.id, x: k.grid_x, y: k.grid_y, w: k.grid_w, h: k.grid_h, ...minSize(k) }
    }
    const { w, h } = defaultSize(k)
    if (cursorX + w > COLUMNS) {
      cursorX = 0
      cursorY += rowMaxH
      rowMaxH = 0
    }
    const item = { i: k.id, x: cursorX, y: cursorY, w, h, ...minSize(k) }
    cursorX += w
    rowMaxH = Math.max(rowMaxH, h)
    return item
  })
}

// RGL's noCompactor.compact() clones the layout (new array + new item objects) on every
// call, including from an internal effect that re-syncs whenever the `layout` prop we
// pass it changes reference — so every setLayout call here produces a new array, which
// RGL re-compacts into yet another new (but value-identical) array and feeds back through
// onLayoutChange, which we'd otherwise setLayout again from, forever. This is what was
// actually causing the header-drag "shaking": not a bug in the push calculation itself
// (that only ever runs once, in onDragStop), but this reference-identity ping-pong
// continuing indefinitely afterward. Comparing by value and bailing out (returning the
// same array reference, which React treats as a no-op) breaks the cycle at the source.
function layoutsEqual(a: Layout, b: Layout): boolean {
  if (a.length !== b.length) return false
  const byId = new Map(a.map((item) => [item.i, item]))
  for (const item of b) {
    const other = byId.get(item.i)
    if (!other || other.x !== item.x || other.y !== item.y || other.w !== item.w || other.h !== item.h) return false
  }
  return true
}

// The one deliberate exception to "overlap is allowed, nothing auto-recalculates":
// dragging a header shifts everything below it (page-wide, not per-column) down by
// however far the header moved — a single, cheap, one-time addition, computed once from
// the layout as it stood at drag-start and applied once on drop. Never run during live
// movement, and never recursive — pushed items are not themselves checked for further
// collisions.
function pushBelowHeader(baseLayout: Layout, headerId: string, target: { x: number; y: number; w: number; h: number }): Layout {
  const headerBase = baseLayout.find((item) => item.i === headerId)
  if (!headerBase) return baseLayout
  const delta = target.y - headerBase.y
  return baseLayout.map((item) => {
    if (item.i === headerId) return { ...item, ...target }
    if (delta !== 0 && item.y > headerBase.y) return { ...item, y: item.y + delta }
    return { ...item }
  })
}

interface EditSnapshot {
  layout: Layout
  pendingHeaders: Record<string, string>
  removedIds: string[]
}

function makePendingHeaderKpi(id: string, label: string, targetPage: string): ModuleKpiWithSource {
  return {
    id,
    label,
    display_type: 'header',
    aggregation: 'custom',
    format: 'number',
    target_page: targetPage,
    module_id: '',
    source_table: '',
    column_name: null,
    filter_column: null,
    filter_value: null,
    chart_type: null,
    bucket_width: null,
    group_bucket_prefixes: null,
    group_by_column: null,
    group_by_column_2: null,
    x_column: null,
    y_column: null,
    secondary_column: null,
    secondary_aggregation: null,
    target_value: null,
    max_value: null,
    param_1_label: null,
    param_1_value: null,
    param_2_label: null,
    param_2_value: null,
    value_colors: null,
    zero_fill_values: null,
    default_color: null,
    secondary_color: null,
    group_name_prefix: null,
    grid_x: null,
    grid_y: null,
    grid_w: COLUMNS,
    grid_h: 3,
    default_grid_x: null,
    default_grid_y: null,
    default_grid_w: null,
    default_grid_h: null,
    sort_order: 0,
    enabled: true,
  }
}

export function KpiGrid({
  targetPage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datasets,
  customValues,
  customCharts,
  customPanels,
  customBreakdowns,
  programs,
  canEdit,
  tabFilters,
  toolbarPortalTarget,
  onKpisChange,
}: {
  targetPage: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datasets: Record<string, any[]>
  customValues?: Record<string, CustomValue>
  customCharts?: Record<string, ChartValue>
  customPanels?: Record<string, ReactNode>
  customBreakdowns?: Record<string, BreakdownValue>
  // Passed straight through to KpiEditDialog for KPIs that support filtering by program
  // (e.g. Dean's List) — sourced from the page's own usePrograms() call rather than
  // fetched again here, same reasoning as `datasets` being passed in rather than re-fetched.
  programs?: Program[]
  canEdit?: boolean
  // The page's own useTabFilters() instance — drives the always-visible Filter button/drawer
  // and resolves each generically-computed (non aggregation='custom') kpi's effective runtime
  // filter before it's handed to computeKpiValue/computeChartData. A page with
  // aggregation='custom' kpis (breakdowns, bespoke customValues/customCharts) is responsible
  // for reading this same instance's resolvedByKpi itself when building those — KpiGrid has
  // no way to reach into a page's own bespoke computation code to filter it automatically.
  tabFilters?: UseTabFilters
  // When provided, the Edit Layout / Save / Cancel / etc. toolbar renders inline with the
  // page title (via the PageHeader's `actions` slot) instead of its own row above the
  // grid — keeps the grid's first row of cards from being pushed down by a toolbar-sized
  // gap. Falls back to the inline row below if a page doesn't wire this up.
  toolbarPortalTarget?: HTMLElement | null
  // Fires whenever this grid's own module_kpis rows change (initial load, edits, realtime
  // sync). A page whose code-computed KPIs need to read an editable param_1_value/
  // param_2_value (e.g. the at-risk fail threshold) should consume kpis via this callback
  // instead of calling useModuleKpis(targetPage) itself — a second independent fetch has
  // no way to learn about an edit made through *this* grid's own useModuleKpis instance
  // except by waiting on a realtime round-trip, which left params reading stale until a
  // full page reload. Sharing this single fetch makes an edit reflect immediately, since
  // it's driven by the exact same refetch() the edit itself already awaits.
  onKpisChange?: (kpis: ModuleKpiWithSource[]) => void
}) {
  const { kpis, loading, saveLayout, disableKpi, updateKpi, createHeader, resetToDefault, saveCurrentAsDefault } =
    useModuleKpis(targetPage)

  useEffect(() => {
    onKpisChange?.(kpis)
  }, [kpis, onKpisChange])
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout] = useState<Layout>([])
  const [width, setWidth] = useState(0)
  const [deleting, setDeleting] = useState<ModuleKpiWithSource | null>(null)
  const [editing, setEditing] = useState<ModuleKpiWithSource | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  // Headers added this edit session but not yet persisted (id -> label), so Cancel/Undo
  // can discard them without ever touching the database.
  const [pendingHeaders, setPendingHeaders] = useState<Record<string, string>>({})
  // KPIs/headers marked for removal this edit session but not yet persisted — kept visible
  // in the DB (and restorable via Undo/Cancel) until Save Layout actually disables them.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<EditSnapshot[]>([])
  const [confirmingResetDefault, setConfirmingResetDefault] = useState(false)
  const [confirmingSaveAsDefault, setConfirmingSaveAsDefault] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Snapshot of `layout` taken at the start of a header drag — pushBelowHeader diffs the
  // header's drop position against this to get the one-time delta to apply. Not needed
  // for KPI/chart drags (those never recalculate anything else) or for resize (overlap is
  // always allowed, no push behavior on resize at all).
  const gestureBaseRef = useRef<Layout>([])
  // RGL calls its own onLayoutChange prop right after onDragStop, passing its own (un-pushed)
  // computed layout — without this guard that call would immediately clobber the
  // push-below-header result we just committed in onDragStop.
  const suppressNextLayoutChangeRef = useRef(false)
  // Per-item stacking order for the overlap-allowed model (see COMPACTOR/pushBelowHeader
  // above): whichever card was most recently grabbed renders on top of anything it now
  // visually overlaps. A monotonically increasing counter, not a fixed "active vs rest"
  // split, so the *last* touched item stays on top even after the gesture ends.
  const [zIndexById, setZIndexById] = useState<Record<string, number>>({})
  const zCounterRef = useRef(1)
  function bringToFront(id: string) {
    zCounterRef.current += 1
    setZIndexById((prev) => ({ ...prev, [id]: zCounterRef.current }))
  }
  // Headers default to "push mode" (dragging them shifts everything below down, per
  // pushBelowHeader) — toggling a header into this set switches it to free positioning,
  // same overlap-allowed behavior as any KPI card/chart, so it can be repositioned without
  // dragging the page's content along with it. Resets each time edit mode is entered.
  const [freeMoveHeaderIds, setFreeMoveHeaderIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!editMode) setLayout(packLayout(kpis))
  }, [kpis, editMode])

  useEffect(() => {
    if (!isDesktop) setEditMode(false)
  }, [isDesktop])

  useEffect(() => {
    // containerRef only attaches once `loading` is false (the ref'd div isn't rendered
    // during the loading/skeleton state), so this must re-run after that flips.
    const el = containerRef.current
    if (!el) return
    // Pushing a card down (see resolveSingleHopCollisions) can grow the grid's total
    // height enough to toggle the page's vertical scrollbar, which shaves a few pixels
    // off this container's width — that width change re-triggers this observer, and if
    // it toggles the scrollbar back off, back on, etc., width never settles. Rounding to
    // whole pixels and skipping no-op updates breaks that oscillation before it can spiral
    // into the "Maximum update depth exceeded" loop it was tripping in Recharts' internal
    // ResponsiveContainer store.
    let lastWidth = -1
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width)
      if (next === lastWidth) return
      lastWidth = next
      setWidth(next)
    })
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [loading])

  const pendingHeaderKpis = useMemo(
    () => Object.entries(pendingHeaders).map(([id, label]) => makePendingHeaderKpi(id, label, targetPage)),
    [pendingHeaders, targetPage],
  )

  // Staged removals stay hidden from the grid immediately, but aren't disabled in the
  // database until Save Layout — so Undo/Cancel/Reset can bring them back for free.
  const effectiveKpis = useMemo(
    () => [...kpis.filter((k) => !removedIds.has(k.id)), ...pendingHeaderKpis],
    [kpis, removedIds, pendingHeaderKpis],
  )

  const cards = useMemo(
    () =>
      effectiveKpis.map((kpi) => {
        const rawRows = datasets[kpi.source_table] ?? []
        if (kpi.display_type === 'header') {
          return { kpi }
        }
        if (kpi.display_type === 'panel') {
          return { kpi, panel: customPanels?.[kpi.column_name ?? ''] }
        }
        // A generic (non aggregation='custom') kpi is filtered here, uniformly, from the
        // page's resolved runtime filter — aggregation='custom' kpis are computed entirely
        // by the page's own code (customValues/customCharts/customBreakdowns), so filtering
        // those happens there instead, against this same tabFilters instance.
        const rows = kpi.aggregation === 'custom' ? rawRows : applyRuntimeFilter(rawRows, tabFilters?.resolvedByKpi[kpi.id])
        if (kpi.display_type === 'chart') {
          return { kpi, chart: computeChartData(kpi, rows, customCharts) }
        }
        if (kpi.display_type === 'breakdown') {
          return { kpi, breakdown: computeBreakdownData(kpi, customBreakdowns) }
        }
        const cv = computeKpiValue(kpi, rows, customValues)
        return { kpi, value: formatKpiValue(cv), context: cv.context }
      }),
    [effectiveKpis, datasets, customValues, customCharts, customPanels, customBreakdowns, tabFilters],
  )

  // Snapshots the current in-progress edit state (position, pending headers, staged
  // removals) so Undo can step back to it. Called once per gesture — at drag/resize start,
  // and before add/remove — not on every intermediate move.
  function pushHistory() {
    setHistory((h) => [...h, { layout, pendingHeaders, removedIds: Array.from(removedIds) }])
  }

  function handleUndo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setLayout(prev.layout)
    setPendingHeaders(prev.pendingHeaders)
    setRemovedIds(new Set(prev.removedIds))
    setHistory(history.slice(0, -1))
  }

  function resetToSaved() {
    setLayout(packLayout(kpis))
    setPendingHeaders({})
    setRemovedIds(new Set())
    setHistory([])
    setFreeMoveHeaderIds(new Set())
  }

  // Shared by handleSave and handleSaveAsDefault — persists the in-progress edit state
  // (new headers, staged removals, positions/sizes) exactly the same way either time, so
  // "Save as Default" can never end up snapshotting a default that doesn't match what
  // Save Layout would have written for the current arrangement.
  async function persistCurrentLayout() {
    // New headers persist first so their real ids replace the temp ids used while dragging.
    const idMap = new Map<string, string>()
    for (const [tempId, label] of Object.entries(pendingHeaders)) {
      const created = await createHeader(label)
      if (created) idMap.set(tempId, created.id)
    }
    await Promise.all(Array.from(removedIds).map((id) => disableKpi(id)))
    const updates = layout
      .filter((item) => !removedIds.has(item.i))
      .map((item) => ({
        id: idMap.get(item.i) ?? item.i,
        grid_x: item.x,
        grid_y: item.y,
        grid_w: item.w,
        grid_h: item.h,
      }))
    await saveLayout(updates)
  }

  function finishEditSession() {
    setPendingHeaders({})
    setRemovedIds(new Set())
    setHistory([])
    setFreeMoveHeaderIds(new Set())
    setEditMode(false)
  }

  async function handleSave() {
    await persistCurrentLayout()
    finishEditSession()
    toast.success('Layout saved')
  }

  async function handleSaveAsDefault() {
    await persistCurrentLayout()
    await saveCurrentAsDefault()
    finishEditSession()
    setConfirmingSaveAsDefault(false)
    toast.success('Saved as the new default layout')
  }

  function handleCancel() {
    resetToSaved()
    setEditMode(false)
  }

  function handleConfirmDelete() {
    if (!deleting) return
    pushHistory()
    setRemovedIds((prev) => new Set(prev).add(deleting.id))
    setLayout((prev) => prev.filter((item) => item.i !== deleting.id))
    toast.success(`"${deleting.label}" will be removed when you save the layout`)
    setDeleting(null)
  }

  function handleAddHeader() {
    pushHistory()
    const tempId = `temp-${crypto.randomUUID()}`
    setPendingHeaders((prev) => ({ ...prev, [tempId]: 'Section title' }))
    // `layout` only re-syncs from `kpis` when not editing (so an in-progress drag/resize
    // isn't clobbered by a background refetch) — append the new header directly so it
    // shows up immediately instead of falling back to react-grid-layout's 1x1 default.
    setLayout((prev) => {
      const maxY = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0)
      return [...prev, { i: tempId, x: 0, y: maxY, w: COLUMNS, h: 3, minW: 4, minH: 3 }]
    })
  }

  // Headers are purely organizational — no data loss risk, so skip the confirmation
  // dialog required for KPI cards/charts. A never-saved (pending) header is just discarded
  // locally; a persisted one is staged for removal like any other card.
  function handleRemoveHeader(kpi: ModuleKpiWithSource) {
    pushHistory()
    if (pendingHeaders[kpi.id] !== undefined) {
      setPendingHeaders((prev) => {
        const next = { ...prev }
        delete next[kpi.id]
        return next
      })
    } else {
      setRemovedIds((prev) => new Set(prev).add(kpi.id))
    }
    setLayout((prev) => prev.filter((item) => item.i !== kpi.id))
  }

  function startRename(kpi: ModuleKpiWithSource) {
    setRenamingId(kpi.id)
    setRenameValue(kpi.label)
  }

  async function commitRename() {
    if (renamingId && renameValue.trim()) {
      if (pendingHeaders[renamingId] !== undefined) {
        setPendingHeaders((prev) => ({ ...prev, [renamingId]: renameValue.trim() }))
      } else {
        await updateKpi(renamingId, { label: renameValue.trim() })
      }
    }
    setRenamingId(null)
  }

  async function handleResetToDefault() {
    await resetToDefault()
    setPendingHeaders({})
    setRemovedIds(new Set())
    setHistory([])
    setFreeMoveHeaderIds(new Set())
    setConfirmingResetDefault(false)
    // Exit edit mode so the kpis-driven sync effect (gated on `!editMode`) picks up the
    // freshly-refetched positions — staying in edit mode left the grid showing the old,
    // now-stale local `layout` even though the database had already changed underneath it.
    setEditMode(false)
    toast.success('Layout reset to default')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (kpis.length === 0) return null

  function renderCardBody({ kpi, value, context, chart, panel, breakdown }: (typeof cards)[number]) {
    if (kpi.display_type === 'header') {
      if (renamingId === kpi.id) {
        return (
          <Input
            autoFocus
            dir="auto"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenamingId(null)
            }}
            className="kpi-no-drag h-full text-lg font-semibold"
          />
        )
      }
      return (
        <div
          dir="auto"
          className="flex h-full items-center px-1 text-lg font-semibold text-foreground"
          onDoubleClick={() => editMode && startRename(kpi)}
        >
          {kpi.label}
        </div>
      )
    }
    if (kpi.display_type === 'panel') return <>{panel}</>
    if (kpi.display_type === 'breakdown') {
      const bd = breakdown ?? { topLabel: '', topValue: { value: null }, segments: [] }
      return (
        <BreakdownKpiCard
          title={kpi.label}
          topLabel={bd.topLabel}
          topValue={formatKpiValue(bd.topValue)}
          segments={bd.segments}
        />
      )
    }
    if (kpi.display_type === 'chart') {
      // A chart pulled into the KPI row (small footprint, per the density brief) renders
      // as a compact card — smaller title, no legend — instead of a shrunken full chart.
      return (
        <GenericKpiChart
          title={kpi.label}
          type={kpi.chart_type ?? 'bar'}
          data={chart?.data ?? []}
          colors={chart?.colors}
          defaultColor={chart?.defaultColor}
          secondaryColor={chart?.secondaryColor}
          // 'bar' is the one chart_type that can be either single-series (no group_by_column
          // — e.g. a bucket_width histogram like Score Distribution) or categorical (grouped
          // by a column, one color per distinct value) — this tells GenericKpiChart which of
          // the two its per-bar fill should follow. Every other categorical type
          // (donut/funnel/treemap/stacked_bar) structurally requires a group-by column to
          // render at all, so they're always categorical and don't need this flag.
          hasCategoryColors={chartCategoryDimension(kpi) !== null}
          seriesKeys={chart?.seriesKeys}
          rowKeys={chart?.rowKeys}
          gaugeValue={chart?.gaugeValue}
          target={chart?.target}
          max={chart?.max}
          notConfigured={chart?.notConfigured}
          compact={(kpi.grid_w ?? 12) <= 6}
        />
      )
    }
    return <KpiCard label={kpi.label} value={value ?? '—'} icon={MODULE_ICONS[kpi.source_table]} context={context} />
  }

  if (!isDesktop) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.kpi.id}
            className={
              c.kpi.display_type === 'header'
                ? 'col-span-2 sm:col-span-3'
                : c.kpi.display_type !== 'number'
                  ? 'col-span-2 h-64 sm:col-span-3'
                  : ''
            }
          >
            {renderCardBody(c)}
          </div>
        ))}
      </div>
    )
  }

  // Sticky only while actually editing — otherwise this is just the single "Edit Layout"
  // button and there's nothing worth pinning. The background/padding/shadow keep it
  // legible once it detaches from the page title and floats over scrolled-past content;
  // z-40 keeps it above grid cards (their own z-index only ever climbs via bringToFront,
  // but that's scoped to the grid's own stacking context either way).
  // The Filter button is visible to every role (not gated on canEdit like the rest of this
  // toolbar) — day-to-day filtering happens here now instead of through per-KPI edit dialogs.
  const toolbar = (canEdit || tabFilters) && (
    <div
      className={cn(
        'flex flex-wrap justify-end gap-2',
        editMode && 'sticky top-0 z-40 -mx-2 -my-1 rounded-lg bg-background/95 px-2 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80',
      )}
    >
      {tabFilters && <GlobalFilterPanel filters={tabFilters} programs={programs ?? []} />}
      {canEdit &&
        (editMode ? (
          <>
            <Button size="sm" variant="outline" onClick={handleAddHeader}>
              <Heading className="size-4" />
              Add Header
            </Button>
            <Button size="sm" variant="outline" disabled={history.length === 0} onClick={handleUndo}>
              <Undo2 className="size-4" />
              Undo
            </Button>
            <Button size="sm" variant="outline" onClick={resetToSaved}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmingResetDefault(true)}>
              <RotateCcw className="size-4" />
              Reset to Default
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmingSaveAsDefault(true)}>
              <BookmarkPlus className="size-4" />
              Save as Default
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="size-4" />
              Save Layout
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditMode(true)
              setHistory([])
              setRemovedIds(new Set())
              setPendingHeaders({})
              setFreeMoveHeaderIds(new Set())
            }}
          >
            <Pencil className="size-4" />
            Edit Layout
          </Button>
        ))}
    </div>
  )

  // While editing, the toolbar renders in-place here (inside this block-level root) rather
  // than portaled into PageHeader's inline title row — position:sticky silently no-ops on
  // an element with a `display:flex` ancestor anywhere in its chain (confirmed via direct
  // DOM experimentation: relocating the exact same node one level up, out from under
  // PageHeader's flex row, is the only thing that made it stick; toggling flex-wrap/
  // align-items/justify-content on that row changed nothing), and PageHeader's row is
  // flex. Outside edit mode there's just the single "Edit Layout" button — not sticky, no
  // conflict — so that one still portals inline with the title as before.
  const showToolbarInPlace = editMode || !toolbarPortalTarget
  return (
    <div className="space-y-2">
      {showToolbarInPlace ? toolbar : createPortal(toolbar, toolbarPortalTarget)}
      <div ref={containerRef}>
        {width > 0 && (
          <ReactGridLayout
            layout={layout}
            width={width}
            gridConfig={{ cols: COLUMNS, rowHeight: ROW_HEIGHT, margin: MARGIN, containerPadding: [0, 0], maxRows: Infinity }}
            dragConfig={{ enabled: editMode, cancel: '.kpi-no-drag' }}
            resizeConfig={{ enabled: editMode, handles: ['se'] }}
            compactor={COMPACTOR}
            onLayoutChange={(next) => {
              if (suppressNextLayoutChangeRef.current) {
                suppressNextLayoutChangeRef.current = false
                return
              }
              setLayout((prev) => (layoutsEqual(prev, next) ? prev : next))
            }}
            onDragStart={(_l, oldItem) => {
              pushHistory()
              gestureBaseRef.current = layout
              if (oldItem) bringToFront(oldItem.i)
            }}
            onDragStop={(_l, _oldItem, newItem) => {
              if (!newItem) return
              const kpi = effectiveKpis.find((k) => k.id === newItem.i)
              const isHeaderInPushMode = kpi?.display_type === 'header' && !freeMoveHeaderIds.has(newItem.i)
              if (isHeaderInPushMode) {
                suppressNextLayoutChangeRef.current = true
                const base = gestureBaseRef.current
                const target = { x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h }
                const headerId = newItem.i
                // Deferred one tick: RGL runs its own post-drop cleanup (clearing its
                // internal drag state, then firing onLayoutChange) synchronously right
                // after this callback returns. Computing the push inline here landed our
                // setLayout call in the middle of that cleanup and set up an ongoing
                // ping-pong between RGL's internal state and ours; letting RGL finish
                // first avoids it.
                setTimeout(() => setLayout(pushBelowHeader(base, headerId, target)), 0)
              }
              // Otherwise: overlap is allowed and nothing else recalculates — the default
              // onLayoutChange handler (fired right after this by RGL) already places just
              // the dragged item correctly, nothing more to do here.
            }}
            onResizeStart={(_l, oldItem) => {
              pushHistory()
              if (oldItem) bringToFront(oldItem.i)
            }}
          >
            {cards.map((c) => {
              const isHeader = c.kpi.display_type === 'header'
              return (
              <div
                key={c.kpi.id}
                style={{ zIndex: zIndexById[c.kpi.id] ?? 0 }}
                className={cn(
                  'group/kpi relative h-full w-full',
                  editMode && (isHeader ? 'rounded-md ring-1 ring-dashed ring-primary/40' : 'rounded-2xl ring-2 ring-primary/40'),
                )}
              >
                {renderCardBody(c)}
                {editMode && isHeader && (
                  <div className="kpi-no-drag absolute top-1 right-1 z-10 flex gap-1 opacity-0 transition-opacity group-hover/kpi:opacity-100">
                    <button
                      type="button"
                      onClick={() =>
                        setFreeMoveHeaderIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(c.kpi.id)) next.delete(c.kpi.id)
                          else next.add(c.kpi.id)
                          return next
                        })
                      }
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full shadow',
                        freeMoveHeaderIds.has(c.kpi.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-popover text-muted-foreground hover:text-foreground',
                      )}
                      aria-label={
                        freeMoveHeaderIds.has(c.kpi.id)
                          ? 'Free move enabled — dragging this header will not shift content below it'
                          : 'Enable free move — dragging this header currently pushes content below it down'
                      }
                      title={
                        freeMoveHeaderIds.has(c.kpi.id)
                          ? 'Free move: dragging this header won’t shift content below'
                          : 'Push mode: dragging this header shifts content below it down'
                      }
                    >
                      <Move className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startRename(c.kpi)}
                      className="flex size-6 items-center justify-center rounded-full bg-popover text-muted-foreground shadow hover:text-foreground"
                      aria-label="Rename header"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(c.kpi)}
                      className="flex size-6 items-center justify-center rounded-full bg-popover text-destructive shadow hover:bg-destructive/10"
                      aria-label="Remove header"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
                {editMode && !isHeader && (
                  <>
                    <div className="kpi-no-drag absolute top-1 right-1 z-10 flex gap-1 opacity-0 transition-opacity group-hover/kpi:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditing(c.kpi)}
                        className="flex size-6 items-center justify-center rounded-full bg-popover text-muted-foreground shadow hover:text-foreground"
                        aria-label="Edit KPI"
                      >
                        <Settings2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(c.kpi)}
                        className="flex size-6 items-center justify-center rounded-full bg-popover text-destructive shadow hover:bg-destructive/10"
                        aria-label="Remove KPI"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              )
            })}
          </ReactGridLayout>
        )}
      </div>

      <KpiEditDialog
        kpi={editing}
        rows={editing ? (datasets[editing.source_table] ?? []) : []}
        programs={programs ?? []}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (patch) => {
          if (editing) await updateKpi(editing.id, patch)
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this KPI?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.label}" will be hidden once you save the layout — it isn't deleted, and
              an admin can re-enable it later from the Supabase table editor. Until you save, you
              can still bring it back with Undo or Cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingResetDefault} onOpenChange={setConfirmingResetDefault}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the original standard positions and sizes this page shipped with —
              not just your last save — including its standard section headers, and removes any
              custom headers you've added. KPI/chart/panel cards themselves aren't deleted, only
              their layout customization. This applies immediately (including to anything already
              saved) and can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefault}>Reset to Default</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingSaveAsDefault} onOpenChange={setConfirmingSaveAsDefault}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this as the new default layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current default layout with what you see now. Anyone who
              clicks "Reset to Default" from now on will get this arrangement instead of the
              previous one. This can't be easily undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsDefault}>Save as Default</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
