import type { Tables } from '@/types/database.types'

export type ModuleKpi = Tables<'module_kpis'>
export type DashboardModule = Tables<'modules'>

// Small supporting visual embedded inside a number card, alongside the label/value —
// 'proportion' draws a thin filled bar for value/total (e.g. a percent, or a count against
// some whole); 'breakdown' draws a small multi-segment stacked bar for a category split.
export type KpiContext =
  | { type: 'proportion'; value: number; total: number }
  | { type: 'breakdown'; segments: { label: string; value: number; color: string }[] }

export interface CustomValue {
  value: number | string | null
  format?: string
  context?: KpiContext
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(rows: any[], kpi: ModuleKpi): any[] {
  return kpi.filter_column ? rows.filter((r) => String(r[kpi.filter_column!] ?? '') === kpi.filter_value) : rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aggregate(aggregation: string, column: string | null, rows: any[]): number | null {
  if (aggregation === 'count') return rows.length
  if (!column) return null
  const values = rows.map((r) => r[column]).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (aggregation === 'sum') return values.reduce((sum, v) => sum + v, 0)
  if (aggregation === 'avg') return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null
  if (aggregation === 'max') return values.length ? Math.max(...values) : null
  if (aggregation === 'min') return values.length ? Math.min(...values) : null
  return null
}

/** Value for a `display_type: 'number'` kpi. `customValues` supplies pre-computed
 * results for `aggregation: 'custom'` rows (multi-row/derived logic that can't be
 * expressed as a plain count/sum/avg), keyed by `column_name` as a lookup code. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeKpiValue(kpi: ModuleKpi, rows: any[], customValues?: Record<string, CustomValue>): CustomValue {
  if (kpi.aggregation === 'custom') {
    return customValues?.[kpi.column_name ?? ''] ?? { value: null }
  }
  return { value: aggregate(kpi.aggregation, kpi.column_name, applyFilter(rows, kpi)), format: kpi.format }
}

interface GroupedBucket {
  name: string
  value: number
  // Raw row count behind this bucket — distinct from `value` (which can be an avg/percent
  // that's legitimately 0) — used to drop buckets with literally no underlying data from
  // both the rendered chart and the Colors editor's category list, so a category that
  // "doesn't exist" in the data doesn't visually exist either (see computeGroupedKpiData).
  rowCount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeGroupedBuckets(kpi: ModuleKpi, rows: any[]): GroupedBucket[] {
  const prefix = kpi.group_name_prefix ?? ''

  // Numeric-range binning (a histogram) — bucket_width takes priority over group_by_column
  // when set, since it needs a different bucketing strategy (ranges of a numeric column
  // rather than its exact distinct values). Buckets start at 0 and run to the highest value
  // present, same behavior as the bespoke Score Distribution panel this replaced.
  if (kpi.bucket_width && kpi.column_name) {
    const width = kpi.bucket_width
    const filtered = applyFilter(rows, kpi)
    const values = filtered
      .map((r) => r[kpi.column_name!])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
    if (values.length === 0) return []
    const maxVal = Math.max(...values)
    const bucketCount = Math.max(1, Math.ceil((maxVal + 1) / width))
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      name: `${prefix}${i * width}-${Math.min(maxVal, i * width + width - 1)}`,
      value: 0,
      rowCount: 0,
    }))
    for (const v of values) {
      const idx = Math.min(bucketCount - 1, Math.floor(v / width))
      buckets[idx].value++
      buckets[idx].rowCount++
    }
    return buckets
  }

  if (!kpi.group_by_column) return []

  // Grouped/bucketed rollup — a targeted exception for status-style columns that pack many
  // granular sub-values (e.g. "Graduated - Excellent", "Probation - Supplementary(3)") under
  // a handful of meaningful prefixes. When set, `group_bucket_prefixes` collapses every raw
  // value starting with one of these prefixes into that one bucket, with anything left over
  // (including "Unknown") landing in a fixed "Other" bucket — instead of listing every raw
  // distinct value like the general auto-detection path below does. This must stay opt-in
  // (only charts with this column actually set use it) so genuinely flat categories like
  // grade_letter or admission_year keep their normal raw-value behavior.
  if (kpi.group_bucket_prefixes && kpi.group_bucket_prefixes.length > 0) {
    const filtered = applyFilter(rows, kpi)
    const bucketKeys = [...kpi.group_bucket_prefixes, 'Other']
    const groups = new Map<string, unknown[]>(bucketKeys.map((key) => [key, []]))
    for (const row of filtered) {
      const raw = String(row[kpi.group_by_column] ?? 'Unknown')
      const key = kpi.group_bucket_prefixes.find((p) => raw.startsWith(p)) ?? 'Other'
      groups.get(key)!.push(row)
    }
    return bucketKeys.map((key) => {
      const groupRows = groups.get(key) ?? []
      return { name: `${prefix}${key}`, value: aggregate(kpi.aggregation, kpi.column_name, groupRows) ?? 0, rowCount: groupRows.length }
    })
  }

  // percent_match buckets first, then reduces each bucket to "% of its own rows matching
  // filter_column/filter_value" — e.g. group_by_column='level', filter_column='status',
  // filter_value='Passed' reproduces a per-level pass rate. This is why percent_match must
  // NOT run rows through applyFilter() first like every other aggregation does: that would
  // pre-restrict the whole dataset to only matching rows before grouping, making the
  // "matching" numerator always equal the group's own size (100%, always).
  if (kpi.aggregation === 'percent_match') {
    const groups = new Map<string, unknown[]>()
    for (const row of rows) {
      const key = String(row[kpi.group_by_column] ?? 'Unknown')
      const list = groups.get(key) ?? []
      list.push(row)
      groups.set(key, list)
    }
    const reduce = (key: string, groupRows: unknown[]): GroupedBucket => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matching = kpi.filter_column ? (groupRows as any[]).filter((r) => String(r[kpi.filter_column!] ?? '') === kpi.filter_value).length : 0
      const value = groupRows.length ? Math.round((matching / groupRows.length) * 1000) / 10 : 0
      return { name: `${prefix}${key}`, value, rowCount: groupRows.length }
    }
    if (kpi.zero_fill_values && kpi.zero_fill_values.length > 0) {
      return kpi.zero_fill_values.map((key) => reduce(key, groups.get(key) ?? []))
    }
    return Array.from(groups.entries())
      .map(([key, groupRows]) => reduce(key, groupRows))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const filtered = applyFilter(rows, kpi)
  const groups = new Map<string, unknown[]>()
  for (const row of filtered) {
    const key = String(row[kpi.group_by_column] ?? 'Unknown')
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  if (kpi.zero_fill_values && kpi.zero_fill_values.length > 0) {
    return kpi.zero_fill_values.map((key) => {
      const groupRows = groups.get(key) ?? []
      return { name: `${prefix}${key}`, value: aggregate(kpi.aggregation, kpi.column_name, groupRows) ?? 0, rowCount: groupRows.length }
    })
  }
  return Array.from(groups.entries())
    .map(([key, groupRows]) => ({
      name: `${prefix}${key}`,
      value: aggregate(kpi.aggregation, kpi.column_name, groupRows) ?? 0,
      rowCount: groupRows.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Grouped {name,value}[] for a `display_type: 'chart'` kpi — group_by_column buckets the
 * (optionally filtered) rows, then each bucket is reduced with the same aggregation rules.
 * Backs bar/line/donut/funnel/treemap/table, which are all single-dimension/single-measure.
 *
 * Buckets with zero underlying rows are dropped entirely — a category with no data doesn't
 * exist visually, in the chart or in its legend, even if `zero_fill_values` names it as one
 * of the known possible values (that list still controls ordering/which values get looked
 * for; it no longer forces an empty one to render as a visible zero-height bar/slice).
 * `group_name_prefix` prepends onto the raw column value to form the display name (e.g.
 * "Level " + "1"), for charts whose original hardcoded label wasn't the bare column value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeGroupedKpiData(kpi: ModuleKpi, rows: any[]): { name: string; value: number }[] {
  return computeGroupedBuckets(kpi, rows)
    .filter((b) => b.rowCount > 0)
    .map(({ name, value }) => ({ name, value }))
}

// Chart types whose per-Cell/per-Bar fill is keyed by the group_by_column bucket name
// (computeGroupedBuckets' output) — the only ones a fixed, data-derived category color list
// means anything for. 'stacked_bar' also has per-category colors, but keyed by the *other*
// dimension (group_by_column_2, the series/stack split) — see chartCategoryDimension below.
// bucket_width-driven bar/line/etc. (a numeric histogram, no group_by_column) has no
// categories at all, just ranges, so it's excluded even though its chart_type is in this set.
const HAS_GROUP_BY_CATEGORIES = new Set(['bar', 'donut', 'funnel', 'treemap'])

/** Which dimension (if any) a chart's per-category colors are keyed by — the single source
 * of truth both the renderer (DashboardCharts.tsx) and the Colors editor (KpiEditDialog)
 * read from, so they can never drift out of sync the way they did when each independently
 * guessed at "is this chart categorical" (the bug behind Grade Distribution-style charts
 * showing categories in the editor that didn't match what the chart itself keyed its Cell
 * fills by). `null` means "single-series" — exactly one Default color applies. */
export function chartCategoryDimension(
  kpi: Pick<ModuleKpi, 'chart_type' | 'group_by_column' | 'group_by_column_2' | 'bucket_width'>,
): 'group_by' | 'series' | null {
  if (kpi.chart_type === 'stacked_bar') return kpi.group_by_column && kpi.group_by_column_2 ? 'series' : null
  if (kpi.chart_type && HAS_GROUP_BY_CATEGORIES.has(kpi.chart_type) && kpi.group_by_column && !kpi.bucket_width) return 'group_by'
  return null
}

/** The real, current category list for a chart's Colors editor — computed by running the
 * exact same bucketing (computeGroupedBuckets/computeTwoDimGroups) the renderer itself uses,
 * so a label shown here is guaranteed to be a key the chart actually looks up in its
 * `colors` map. Returns `[]` for a single-series chart (see chartCategoryDimension) — the
 * caller shows one plain Default color swatch in that case instead. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeChartCategories(kpi: ModuleKpi, rows: any[]): string[] {
  const dim = chartCategoryDimension(kpi)
  if (dim === 'series') return computeTwoDimGroups(kpi, rows).seriesKeys
  if (dim === 'group_by') return computeGroupedBuckets(kpi, rows).filter((b) => b.rowCount > 0).map((b) => b.name)
  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeTwoDimGroups(kpi: ModuleKpi, rows: any[]) {
  const filtered = applyFilter(rows, kpi)
  const rowKeySet = new Set<string>()
  const seriesKeySet = new Set<string>()
  const buckets = new Map<string, unknown[]>()
  for (const row of filtered) {
    const rowKey = String(row[kpi.group_by_column!] ?? 'Unknown')
    const seriesKey = String(row[kpi.group_by_column_2!] ?? 'Unknown')
    rowKeySet.add(rowKey)
    seriesKeySet.add(seriesKey)
    const cellKey = `${rowKey} ${seriesKey}`
    const list = buckets.get(cellKey) ?? []
    list.push(row)
    buckets.set(cellKey, list)
  }
  const cells = new Map<string, number>()
  for (const [cellKey, cellRows] of buckets) {
    cells.set(cellKey, aggregate(kpi.aggregation, kpi.column_name, cellRows) ?? 0)
  }
  return {
    rowKeys: Array.from(rowKeySet).sort((a, b) => a.localeCompare(b)),
    seriesKeys: Array.from(seriesKeySet).sort((a, b) => a.localeCompare(b)),
    cells,
  }
}

// Wide-format rows ({name, [seriesKey]: value, ...}) for a stacked bar — one recharts <Bar>
// per series, all sharing the same stackId.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeStackedData(kpi: ModuleKpi, rows: any[]): ChartValue {
  const { rowKeys, seriesKeys, cells } = computeTwoDimGroups(kpi, rows)
  const data = rowKeys.map((rowKey) => {
    const entry: Record<string, string | number> = { name: rowKey }
    for (const seriesKey of seriesKeys) entry[seriesKey] = cells.get(`${rowKey} ${seriesKey}`) ?? 0
    return entry
  })
  return { data, seriesKeys }
}

// Long-format {row, col, value}[] matrix cells for the custom heatmap grid.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeHeatmapData(kpi: ModuleKpi, rows: any[]): ChartValue {
  const { rowKeys, seriesKeys, cells } = computeTwoDimGroups(kpi, rows)
  const data = rowKeys.flatMap((rowKey) =>
    seriesKeys.map((seriesKey) => ({ row: rowKey, col: seriesKey, value: cells.get(`${rowKey} ${seriesKey}`) ?? 0 })),
  )
  return { data, rowKeys, seriesKeys }
}

// Raw per-row {x,y} pairs (no grouping/aggregation) for a scatter plot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeScatterData(kpi: ModuleKpi, rows: any[]): ChartValue {
  const filtered = applyFilter(rows, kpi)
  const data = filtered
    .map((r) => ({ x: r[kpi.x_column!], y: r[kpi.y_column!] }))
    .filter((p): p is { x: number; y: number } => typeof p.x === 'number' && typeof p.y === 'number' && !Number.isNaN(p.x) && !Number.isNaN(p.y))
  return { data }
}

// {name, value, secondaryValue}[] for a bar+line combo — same primary grouping/aggregation
// as a normal chart, plus a second aggregation (secondary_aggregation/secondary_column)
// reduced over the same buckets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeComboData(kpi: ModuleKpi, rows: any[]): ChartValue {
  const filtered = applyFilter(rows, kpi)
  const groups = new Map<string, unknown[]>()
  for (const row of filtered) {
    const key = String(row[kpi.group_by_column!] ?? 'Unknown')
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const data = Array.from(groups.entries())
    .map(([name, groupRows]) => ({
      name,
      value: aggregate(kpi.aggregation, kpi.column_name, groupRows) ?? 0,
      secondaryValue: aggregate(kpi.secondary_aggregation ?? 'count', kpi.secondary_column, groupRows) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { data }
}

export interface ChartValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  colors?: Record<string, string>
  defaultColor?: string
  // combo only: color for the line series (defaultColor covers the bar series).
  secondaryColor?: string
  // Series names for stacked_bar (one <Bar> per key) / column labels for heatmap.
  seriesKeys?: string[]
  // Row labels for heatmap (the other axis of the matrix).
  rowKeys?: string[]
  // gauge/bullet: a single current value plus its target/max, no `data` array involved.
  gaugeValue?: number
  target?: number | null
  max?: number | null
  // Set when the kpi's chart_type needs columns that aren't configured yet (e.g. scatter
  // without x_column/y_column) — renders a clear "not configured" state instead of a blank
  // or broken card.
  notConfigured?: boolean
}

// A chart_type backed by computeGroupedKpiData can be configured either the normal way
// (group_by_column, exact distinct values) or as a numeric histogram (bucket_width +
// column_name, range-binned) — either one is enough to render something.
const hasGrouping = (kpi: ModuleKpi) => !!kpi.group_by_column || (!!kpi.bucket_width && !!kpi.column_name)

// Which extra columns each chart_type needs before it can render anything meaningful.
const CHART_TYPE_REQUIREMENTS: Record<string, (kpi: ModuleKpi) => boolean> = {
  bar: hasGrouping,
  line: hasGrouping,
  donut: hasGrouping,
  area: hasGrouping,
  funnel: hasGrouping,
  treemap: hasGrouping,
  table: hasGrouping,
  stacked_bar: (kpi) => !!kpi.group_by_column && !!kpi.group_by_column_2,
  heatmap: (kpi) => !!kpi.group_by_column && !!kpi.group_by_column_2,
  scatter: (kpi) => !!kpi.x_column && !!kpi.y_column,
  combo: (kpi) => !!kpi.group_by_column && !!kpi.secondary_column,
  gauge: (kpi) => kpi.target_value != null,
  bullet: (kpi) => kpi.target_value != null,
}

/** Chart data for a `display_type: 'chart'` kpi. `customCharts` supplies pre-computed
 * ChartValue objects (bypassing all the grouping logic below) for `aggregation: 'custom'`
 * rows — the same escape hatch as `computeKpiValue`'s customValues, for grouped metrics
 * that aren't a plain column group-by (ratios, derived taxonomies, bespoke coloring). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeChartData(kpi: ModuleKpi, rows: any[], customCharts?: Record<string, ChartValue>): ChartValue {
  if (kpi.aggregation === 'custom') {
    const custom = customCharts?.[kpi.column_name ?? ''] ?? { data: [] }
    // A saved value_colors/default_color override (see KpiEditDialog's "Colors" section)
    // applies on top of whatever colors the page's own custom-chart code supplies, same as
    // for a generically-computed chart below — so a person can recolor e.g. "Enrollment
    // Status Breakdown" without that chart needing to be migrated off aggregation='custom'.
    return {
      ...custom,
      ...(kpi.default_color ? { defaultColor: kpi.default_color } : {}),
      ...(kpi.secondary_color ? { secondaryColor: kpi.secondary_color } : {}),
      ...(kpi.value_colors && typeof kpi.value_colors === 'object' ? { colors: kpi.value_colors as Record<string, string> } : {}),
    }
  }
  const requirement = CHART_TYPE_REQUIREMENTS[kpi.chart_type ?? 'bar']
  if (requirement && !requirement(kpi)) return { data: [], notConfigured: true }

  let result: ChartValue
  switch (kpi.chart_type) {
    case 'stacked_bar':
      result = computeStackedData(kpi, rows)
      break
    case 'heatmap':
      result = computeHeatmapData(kpi, rows)
      break
    case 'scatter':
      result = computeScatterData(kpi, rows)
      break
    case 'combo':
      result = computeComboData(kpi, rows)
      break
    case 'gauge':
    case 'bullet': {
      const cv = computeKpiValue(kpi, rows)
      const value = typeof cv.value === 'number' ? cv.value : 0
      result = { data: [], gaugeValue: value, target: kpi.target_value, max: kpi.max_value ?? (kpi.target_value ?? 0) * 1.25 }
      break
    }
    default:
      // bar, line, donut, area, funnel, treemap, table all share the same {name,value}[] shape.
      result = { data: computeGroupedKpiData(kpi, rows) }
  }
  // Per-row presentation overrides — let a chart migrated off aggregation='custom' keep its
  // original bespoke color/coloring without any DashboardPage.tsx code involved anymore.
  if (kpi.default_color) result.defaultColor = kpi.default_color
  if (kpi.secondary_color) result.secondaryColor = kpi.secondary_color
  if (kpi.value_colors && typeof kpi.value_colors === 'object') result.colors = kpi.value_colors as Record<string, string>
  return result
}

// A `display_type: 'breakdown'` kpi is a compound card: one top-line number plus a row of
// small named sub-values underneath (e.g. "Avg. GPA (all students)" over "Level 1: 3.10 /
// Level 2: 3.05 / Level 3: 3.20"). Unlike chart/number kpis, every breakdown kpi so far needs
// derived, code-computed logic (graduated-status bucketing, per-program ranking) that doesn't
// fit the generic aggregation/group-by engine, so — like aggregation='custom' number/chart
// kpis — this is a pure lookup into page-supplied data, keyed by column_name.
export interface BreakdownValue {
  topLabel: string
  topValue: CustomValue
  segments: { label: string; value: string }[]
}

export function computeBreakdownData(kpi: ModuleKpi, customBreakdowns?: Record<string, BreakdownValue>): BreakdownValue {
  return customBreakdowns?.[kpi.column_name ?? ''] ?? { topLabel: '', topValue: { value: null }, segments: [] }
}

export function formatKpiValue(cv: CustomValue): string {
  const { value, format = 'number' } = cv
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (format === 'currency') return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  if (format === 'percent') return `${value.toFixed(1)}%`
  if (format === 'decimal') return value.toFixed(2)
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
}
