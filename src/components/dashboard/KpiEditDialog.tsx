import { useEffect, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import type { Program } from '@/hooks/usePrograms'
import { useTheme } from 'next-themes'
import { chartCategoryDimension, computeChartCategories, type ModuleKpi } from '@/lib/dashboard/kpiEngine'
import { CHART_TYPES } from '@/components/dashboard/DashboardCharts'
import { ColorPickerPopover } from '@/components/dashboard/ColorPickerPopover'
import { CHART_COLORS, getCategoricalOrder } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const AGGREGATIONS = ['count', 'sum', 'avg', 'max', 'min']
const FORMATS = ['number', 'percent', 'currency', 'decimal']

// Which chart types need which extra config beyond group_by_column/column_name/aggregation
// — drives which extra fields show up below. See DashboardCharts.tsx's CHART_TYPES comment
// for the full column-by-column breakdown.
const NEEDS_GROUP_BY_2 = new Set(['stacked_bar', 'heatmap'])
const NEEDS_XY = new Set(['scatter'])
const NEEDS_SECONDARY = new Set(['combo'])
const NEEDS_TARGET = new Set(['gauge', 'bullet'])
// Chart types backed by a plain group_by_column (single dimension, no row/series split,
// no x/y pair) can alternatively bin a numeric column_name into ranges instead — see
// kpiEngine's bucket_width handling.
const SUPPORTS_BUCKET_WIDTH = new Set(['bar', 'line', 'donut', 'area', 'funnel', 'treemap', 'table'])

// How many sample rows to scan when guessing whether the live "Group by column" text names
// a numeric or text column, and how many distinct values it has — both only used to decide
// whether Bucket width / Bucket prefixes are worth showing at all (see groupByColumnKind
// below). There's no schema introspection available here, only the actual dataset rows
// already loaded for this page, so this is a runtime guess, not a real type lookup.
const COLUMN_KIND_SAMPLE_SIZE = 200

export function KpiEditDialog({
  kpi,
  rows,
  programs,
  onOpenChange,
  onSubmit,
}: {
  kpi: ModuleKpiWithSource | null
  // The current dataset backing this kpi (e.g. all `students` rows) — used only to
  // auto-detect what distinct values group_by_column actually takes on, to seed the Colors
  // section's per-category list.
  rows: unknown[]
  // For KPIs that support a Program filter (currently just Dean's List, marked by
  // filter_column === 'program_id') — lets the picker show real program names instead of
  // raw ids, ready for when more than one program exists.
  programs: Program[]
  onOpenChange: (open: boolean) => void
  onSubmit: (patch: Partial<ModuleKpi>) => Promise<void>
}) {
  const isCustom = kpi?.aggregation === 'custom'
  const { resolvedTheme } = useTheme()
  const categoricalOrder = getCategoricalOrder(resolvedTheme === 'dark')
  const [label, setLabel] = useState('')
  const [aggregation, setAggregation] = useState('count')
  const [columnName, setColumnName] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [format, setFormat] = useState('number')
  const [displayType, setDisplayType] = useState('number')
  const [chartType, setChartType] = useState('bar')
  const [savedChartType, setSavedChartType] = useState('bar')
  const [groupByColumn, setGroupByColumn] = useState('')
  const [groupByColumn2, setGroupByColumn2] = useState('')
  const [xColumn, setXColumn] = useState('')
  const [yColumn, setYColumn] = useState('')
  const [secondaryColumn, setSecondaryColumn] = useState('')
  const [secondaryAggregation, setSecondaryAggregation] = useState('count')
  const [targetValue, setTargetValue] = useState('')
  const [maxValue, setMaxValue] = useState('')
  const [bucketWidth, setBucketWidth] = useState('')
  const [bucketPrefixes, setBucketPrefixes] = useState('')
  const [param1Value, setParam1Value] = useState('')
  const [param2Value, setParam2Value] = useState('')
  const [defaultColorValue, setDefaultColorValue] = useState('')
  const [secondaryColorValue, setSecondaryColorValue] = useState('')
  // Read-only category labels + their colors — derived entirely from the actual chart data
  // (see kpiEngine's computeChartCategories), never typed in by hand. No add/remove: the
  // category list IS whatever the chart's group-by dimension actually contains right now.
  const [categories, setCategories] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const [colorsOpen, setColorsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!kpi) return
    setLabel(kpi.label)
    setAggregation(kpi.aggregation)
    setColumnName(kpi.column_name ?? '')
    setFilterColumn(kpi.filter_column ?? '')
    setFilterValue(kpi.filter_value ?? '')
    setFormat(kpi.format)
    setDisplayType(kpi.display_type)
    setChartType(kpi.chart_type ?? 'bar')
    setSavedChartType(kpi.chart_type ?? 'bar')
    setGroupByColumn(kpi.group_by_column ?? '')
    setGroupByColumn2(kpi.group_by_column_2 ?? '')
    setXColumn(kpi.x_column ?? '')
    setYColumn(kpi.y_column ?? '')
    setSecondaryColumn(kpi.secondary_column ?? '')
    setSecondaryAggregation(kpi.secondary_aggregation ?? 'count')
    setTargetValue(kpi.target_value != null ? String(kpi.target_value) : '')
    setMaxValue(kpi.max_value != null ? String(kpi.max_value) : '')
    setBucketWidth(kpi.bucket_width != null ? String(kpi.bucket_width) : '')
    setBucketPrefixes(kpi.group_bucket_prefixes && kpi.group_bucket_prefixes.length > 0 ? kpi.group_bucket_prefixes.join(', ') : '')
    setParam1Value(kpi.param_1_value != null ? String(kpi.param_1_value) : '')
    setParam2Value(kpi.param_2_value != null ? String(kpi.param_2_value) : '')
    setDefaultColorValue(kpi.default_color ?? '')
    setSecondaryColorValue(kpi.secondary_color ?? '')

    // The category list is computed by running the exact same bucketing the chart itself
    // renders with (computeChartCategories reuses computeGroupedKpiData/computeTwoDimGroups
    // directly) — so a label shown here is guaranteed to be a key the chart actually looks
    // up in `colors`, unlike the old approach of separately re-deriving "what are the
    // categories" (which could drift out of sync, e.g. group_name_prefix being applied to
    // the rendered names but not to the detected ones).
    const cats = chartCategoryDimension(kpi) ? computeChartCategories(kpi, rows) : []
    const savedColors = (kpi.value_colors as Record<string, string> | null) ?? {}
    const colorMap: Record<string, string> = {}
    cats.forEach((name, i) => {
      colorMap[name] = savedColors[name] ?? categoricalOrder[i % categoricalOrder.length]
    })
    setCategories(cats)
    setCategoryColors(colorMap)

    setColorsOpen(false)
    // Only re-derive when a different kpi is opened — `rows` is read at that moment, not
    // tracked as a live dependency, so an in-progress edit isn't reset by a background
    // dataset refetch while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi])

  const chartTypeChangedSinceSave = displayType === 'chart' && chartType !== savedChartType
  const savedDim = kpi ? chartCategoryDimension(kpi) : null

  // Bucket width / Bucket prefixes are only worth showing when the live text naming the
  // relevant column actually looks like the right shape — there's no schema to look up, so
  // this scans a sample of the already-loaded dataset rows. Numeric + many distinct values
  // (e.g. `score`) suggests a histogram is useful; text + many distinct values (e.g.
  // `enrollment_status`) suggests a rollup is useful. A column with only a handful of
  // distinct values (grade_letter, level) doesn't need either, regardless of type.
  function sampleColumnKind(col: string): { kind: 'numeric' | 'text'; distinctCount: number } | null {
    if (!col || rows.length === 0) return null
    let sampled = 0
    let numeric = 0
    const distinct = new Set<string>()
    for (const row of rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = (row as any)[col]
      if (v == null) continue
      sampled++
      if (typeof v === 'number') numeric++
      distinct.add(String(v))
      if (sampled >= COLUMN_KIND_SAMPLE_SIZE) break
    }
    if (sampled === 0) return null
    return { kind: numeric === sampled ? 'numeric' : 'text', distinctCount: distinct.size }
  }
  // bucket_width bins `column_name` (not group_by_column — a bucket_width chart like Score
  // Distribution has no group_by_column at all), so that's what needs sampling here.
  const bucketWidthColumnKind = sampleColumnKind(columnName.trim())
  const showBucketWidth = SUPPORTS_BUCKET_WIDTH.has(chartType) && bucketWidthColumnKind?.kind === 'numeric' && bucketWidthColumnKind.distinctCount > 10
  // group_bucket_prefixes collapses group_by_column's raw values, so that's what needs
  // sampling here instead.
  const groupByColumnKind = sampleColumnKind(groupByColumn.trim())
  const showBucketPrefixes =
    !NEEDS_TARGET.has(chartType) &&
    !NEEDS_GROUP_BY_2.has(chartType) &&
    groupByColumnKind?.kind === 'text' &&
    groupByColumnKind.distinctCount > 6

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!kpi) return
    setSubmitting(true)
    try {
      // Colors are orthogonal to aggregation type — a custom-computed chart (e.g.
      // "Enrollment Status Breakdown") can be recolored exactly like a generic one.
      const savingDim = chartCategoryDimension({
        chart_type: chartType,
        group_by_column: groupByColumn.trim() || null,
        group_by_column_2: groupByColumn2.trim() || null,
        bucket_width: bucketWidth.trim() ? Number(bucketWidth) : null,
      })
      // `categoryColors` was computed from the *saved* config when this dialog opened — if
      // the person changed chart type/group-by since then without saving first, its keys no
      // longer necessarily match what's about to be persisted (the "save and reopen" banner
      // above already tells them this). Only actually persist it when nothing relevant has
      // changed since it was computed, so a stale category list never gets attached to a
      // different configuration.
      const categoriesStillValid =
        !chartTypeChangedSinceSave &&
        groupByColumn === (kpi.group_by_column ?? '') &&
        groupByColumn2 === (kpi.group_by_column_2 ?? '') &&
        bucketWidth === (kpi.bucket_width != null ? String(kpi.bucket_width) : '')
      const colorPatch =
        displayType === 'chart'
          ? {
              // A single "Default color" is meaningless for a chart type that colors per
              // category (its per-Cell fill already comes from value_colors, falling back
              // to the same palette cycling the dialog seeds its color list from) — saving
              // a stray default_color here would just be a value nothing reads.
              default_color: savingDim ? null : defaultColorValue.trim() || null,
              secondary_color: NEEDS_SECONDARY.has(chartType) ? secondaryColorValue.trim() || null : null,
              value_colors: savingDim && categoriesStillValid && Object.keys(categoryColors).length > 0 ? categoryColors : null,
            }
          : {}
      if (isCustom) {
        await onSubmit({
          label: label.trim(),
          ...(kpi?.param_1_label ? { param_1_value: param1Value.trim() ? Number(param1Value) : null } : {}),
          ...(kpi?.param_2_label ? { param_2_value: param2Value.trim() ? Number(param2Value) : null } : {}),
          // filter_column is left untouched — it's a fixed marker ('program_id') set up via
          // migration, not something this dialog offers to edit; only the selected value
          // changes here.
          ...(kpi?.filter_column === 'program_id' ? { filter_value: filterValue.trim() || null } : {}),
          ...colorPatch,
        })
      } else {
        const isChart = displayType === 'chart'
        await onSubmit({
          label: label.trim(),
          aggregation,
          column_name: columnName.trim() || null,
          filter_column: filterColumn.trim() || null,
          filter_value: filterColumn.trim() ? filterValue.trim() || null : null,
          format,
          display_type: displayType,
          chart_type: isChart ? chartType : null,
          group_by_column: isChart ? groupByColumn.trim() || null : null,
          bucket_width: isChart && showBucketWidth && bucketWidth.trim() ? Number(bucketWidth) : null,
          group_bucket_prefixes:
            isChart && showBucketPrefixes && bucketPrefixes.trim()
              ? bucketPrefixes
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : null,
          group_by_column_2: isChart && NEEDS_GROUP_BY_2.has(chartType) ? groupByColumn2.trim() || null : null,
          x_column: isChart && NEEDS_XY.has(chartType) ? xColumn.trim() || null : null,
          y_column: isChart && NEEDS_XY.has(chartType) ? yColumn.trim() || null : null,
          secondary_column: isChart && NEEDS_SECONDARY.has(chartType) ? secondaryColumn.trim() || null : null,
          secondary_aggregation: isChart && NEEDS_SECONDARY.has(chartType) ? secondaryAggregation : null,
          target_value: isChart && NEEDS_TARGET.has(chartType) ? (targetValue.trim() ? Number(targetValue) : null) : null,
          max_value: isChart && NEEDS_TARGET.has(chartType) ? (maxValue.trim() ? Number(maxValue) : null) : null,
          ...colorPatch,
        })
      }
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!kpi} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit KPI</DialogTitle>
          {isCustom && (
            <DialogDescription>
              {kpi?.param_1_label
                ? "This value is computed in code, not a plain aggregation — its logic can't be edited here, but the thresholds below can."
                : "This value is computed in code, not a plain aggregation — only its label can be changed here. Position and visibility are still editable from the layout grid."}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 py-1">
            <div className="space-y-2">
              <Label htmlFor="kpi-label">Label</Label>
              <Input id="kpi-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>

            {isCustom && (kpi?.param_1_label || kpi?.param_2_label) && (
              <div className="grid grid-cols-2 gap-4">
                {kpi.param_1_label && (
                  <div className="space-y-2">
                    <Label htmlFor="kpi-param-1">{kpi.param_1_label}</Label>
                    <Input
                      id="kpi-param-1"
                      type="number"
                      value={param1Value}
                      onChange={(e) => setParam1Value(e.target.value)}
                    />
                  </div>
                )}
                {kpi.param_2_label && (
                  <div className="space-y-2">
                    <Label htmlFor="kpi-param-2">{kpi.param_2_label}</Label>
                    <Input
                      id="kpi-param-2"
                      type="number"
                      value={param2Value}
                      onChange={(e) => setParam2Value(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {isCustom && kpi?.filter_column === 'program_id' && (
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={filterValue || 'all'} onValueChange={(v) => v && setFilterValue(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue>{(v: string) => (v === 'all' ? 'All programs' : (programs.find((p) => p.id === v)?.name ?? v))}</SelectValue>
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
                <p className="text-xs text-muted-foreground">
                  Ready for when more than one program exists — currently only affects results if more than one
                  program is present.
                </p>
              </div>
            )}

            {!isCustom && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aggregation</Label>
                    <Select value={aggregation} onValueChange={(v) => v && setAggregation(v)}>
                      <SelectTrigger>
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {AGGREGATIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                        <SelectItem value="percent_match">percent_match</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kpi-column">
                      Column {bucketWidth.trim() ? '(to bin — required)' : '(for sum/avg/max/min)'}
                    </Label>
                    <Input
                      id="kpi-column"
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      disabled={(aggregation === 'count' || aggregation === 'percent_match') && !bucketWidth.trim()}
                      placeholder="e.g. score"
                    />
                  </div>
                </div>

                {aggregation === 'percent_match' && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Computes, per group, the % of that group&apos;s rows where the filter column below equals the
                    filter value — e.g. group by &quot;level&quot;, filter column &quot;status&quot;, filter value
                    &quot;Passed&quot; gives a per-level pass rate.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kpi-filter-column">
                      Filter column{aggregation === 'percent_match' ? ' (required)' : ''}
                    </Label>
                    <Input
                      id="kpi-filter-column"
                      value={filterColumn}
                      onChange={(e) => setFilterColumn(e.target.value)}
                      placeholder="e.g. level"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kpi-filter-value">
                      Filter value{aggregation === 'percent_match' ? ' (required)' : ''}
                    </Label>
                    <Input
                      id="kpi-filter-value"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      disabled={!filterColumn.trim()}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={format} onValueChange={(v) => v && setFormat(v)}>
                      <SelectTrigger>
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display as</Label>
                    <Select value={displayType} onValueChange={(v) => v && setDisplayType(v)}>
                      <SelectTrigger>
                        <SelectValue>{(v: string) => (v === 'chart' ? 'Chart' : 'Number card')}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number card</SelectItem>
                        <SelectItem value="chart">Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {displayType === 'chart' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Chart type</Label>
                        <Select value={chartType} onValueChange={(v) => v && setChartType(v)}>
                          <SelectTrigger>
                            <SelectValue>{(v: string) => v}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CHART_TYPES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!NEEDS_TARGET.has(chartType) && (
                        <div className="space-y-2">
                          <Label htmlFor="kpi-groupby">
                            {NEEDS_GROUP_BY_2.has(chartType) ? 'Group by (row)' : 'Group by column'}
                          </Label>
                          <Input
                            id="kpi-groupby"
                            value={groupByColumn}
                            onChange={(e) => setGroupByColumn(e.target.value)}
                            placeholder="e.g. grade_letter"
                          />
                        </div>
                      )}
                    </div>

                    {showBucketWidth && (
                      <div className="space-y-2">
                        <Label htmlFor="kpi-bucket-width">Bucket width (optional)</Label>
                        <Input
                          id="kpi-bucket-width"
                          type="number"
                          min={1}
                          value={bucketWidth}
                          onChange={(e) => setBucketWidth(e.target.value)}
                          placeholder="e.g. 10 — bins column_name into ranges instead of grouping by exact values"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to group by Group by column&apos;s exact values. Set this to bin{' '}
                          <span className="font-mono">column_name</span> into numeric ranges of this width instead
                          (e.g. a score histogram).
                        </p>
                      </div>
                    )}

                    {showBucketPrefixes && (
                      <div className="space-y-2">
                        <Label htmlFor="kpi-bucket-prefixes">Bucket prefixes (optional)</Label>
                        <Input
                          id="kpi-bucket-prefixes"
                          value={bucketPrefixes}
                          onChange={(e) => setBucketPrefixes(e.target.value)}
                          placeholder="e.g. Active, Graduated, Probation"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional, comma-separated. Collapses every Group by column value that starts with one of
                          these prefixes into that one bucket (anything else becomes &quot;Other&quot;) — for a
                          status-style column with many granular sub-values (e.g. &quot;Graduated - Excellent&quot;,
                          &quot;Probation - Supplementary(3)&quot;) that should roll up into a few meaningful
                          categories instead of listing every raw value. Leave blank for the normal exact-value
                          behavior.
                        </p>
                      </div>
                    )}

                    {NEEDS_GROUP_BY_2.has(chartType) && (
                      <div className="space-y-2">
                        <Label htmlFor="kpi-groupby-2">Group by (column / series)</Label>
                        <Input
                          id="kpi-groupby-2"
                          value={groupByColumn2}
                          onChange={(e) => setGroupByColumn2(e.target.value)}
                          placeholder="e.g. level"
                        />
                      </div>
                    )}

                    {NEEDS_XY.has(chartType) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="kpi-x-column">X column (numeric)</Label>
                          <Input
                            id="kpi-x-column"
                            value={xColumn}
                            onChange={(e) => setXColumn(e.target.value)}
                            placeholder="e.g. score"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kpi-y-column">Y column (numeric)</Label>
                          <Input
                            id="kpi-y-column"
                            value={yColumn}
                            onChange={(e) => setYColumn(e.target.value)}
                            placeholder="e.g. grade_points"
                          />
                        </div>
                      </div>
                    )}

                    {NEEDS_SECONDARY.has(chartType) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Secondary aggregation (line)</Label>
                          <Select value={secondaryAggregation} onValueChange={(v) => v && setSecondaryAggregation(v)}>
                            <SelectTrigger>
                              <SelectValue>{(v: string) => v}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {AGGREGATIONS.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kpi-secondary-column">Secondary column</Label>
                          <Input
                            id="kpi-secondary-column"
                            value={secondaryColumn}
                            onChange={(e) => setSecondaryColumn(e.target.value)}
                            disabled={secondaryAggregation === 'count'}
                            placeholder="e.g. score"
                          />
                        </div>
                      </div>
                    )}

                    {NEEDS_TARGET.has(chartType) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="kpi-target">Target value</Label>
                          <Input
                            id="kpi-target"
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            placeholder="e.g. 90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kpi-max">Max value (optional)</Label>
                          <Input
                            id="kpi-max"
                            type="number"
                            value={maxValue}
                            onChange={(e) => setMaxValue(e.target.value)}
                            placeholder="defaults to 1.25x target"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {displayType === 'chart' && (
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setColorsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                >
                  Colors
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', colorsOpen && 'rotate-180')} />
                </button>
                {colorsOpen && (
                  <div className="space-y-3 border-t border-border p-3">
                    {chartTypeChangedSinceSave && (
                      <p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                        Chart type changed — save and reopen this panel to see color options for the new type.
                      </p>
                    )}

                    {NEEDS_SECONDARY.has(savedChartType) ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary (bars)</Label>
                          <ColorPickerPopover value={defaultColorValue} onChange={setDefaultColorValue} label="Primary color" />
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary (line)</Label>
                          <ColorPickerPopover value={secondaryColorValue} onChange={setSecondaryColorValue} label="Secondary color" />
                        </div>
                      </div>
                    ) : !savedDim ? (
                      // A chart type with per-category colors already gets its full color
                      // list below, auto-detected from the data — a separate "Default
                      // color" here would just be a value nothing reads once categories are
                      // populated (see the code comment in handleSubmit).
                      <div className="space-y-2">
                        <Label>Default color</Label>
                        <ColorPickerPopover value={defaultColorValue} onChange={setDefaultColorValue} label="Default color" />
                      </div>
                    ) : (
                      // Fixed, read-only category list — each label is a real value pulled
                      // straight from the data (see computeChartCategories), not something
                      // typed in here. No add/remove: the categories ARE whatever the
                      // chart's group-by dimension currently contains.
                      <div className="space-y-2">
                        <Label>Category colors</Label>
                        {categories.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No data yet to detect categories from.</p>
                        ) : (
                          categories.map((name) => (
                            <div key={name} className="flex items-center gap-2">
                              <span className="flex-1 truncate text-sm" dir="auto">
                                {name}
                              </span>
                              <ColorPickerPopover
                                value={categoryColors[name] ?? CHART_COLORS.gold}
                                onChange={(hex) => setCategoryColors((prev) => ({ ...prev, [name]: hex }))}
                                label={`Color for ${name}`}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
