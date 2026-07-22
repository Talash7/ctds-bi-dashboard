import { memo, useEffect, useId, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHART_COLORS, GRADE_COLORS, getChartTextColors } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'

// Axis ticks/gridlines/tooltips need to flip with the theme (dark plum text is invisible on
// a dark background) — every chart below calls this instead of hardcoding colors directly.
export function useChartTextColors() {
  const { resolvedTheme } = useTheme()
  return getChartTextColors(resolvedTheme === 'dark')
}

export function useTooltipStyle() {
  const tc = useChartTextColors()
  return {
    background: tc.tooltipBg,
    border: `1px solid ${tc.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 13,
    color: tc.tooltipText,
  }
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  )
}

// Semantic colors reused by the dashboard's "Grade Distribution" and "Enrollment Status
// Breakdown" chart-type module_kpis rows (passed in as `colors` on GenericKpiChart) so they
// keep matching the StatusBadge palette instead of falling back to generic cycling colors.
export const GRADE_CHART_COLORS = GRADE_COLORS

// Reference list of every chart_type this component knows how to render, and what extra
// module_kpis columns each one needs — kept here (not just in kpiEngine's requirements
// table) so a new chart_type gets a "not configured" state instead of silently rendering as
// a bar chart if someone adds it to the DB constraint/edit dialog but forgets this file.
//   bar        — group_by_column
//   line       — group_by_column
//   donut      — group_by_column
//   area       — group_by_column
//   funnel     — group_by_column
//   treemap    — group_by_column
//   table      — group_by_column (compact ranked list)
//   stacked_bar— group_by_column + group_by_column_2
//   heatmap    — group_by_column + group_by_column_2
//   scatter    — x_column + y_column
//   combo      — group_by_column + secondary_column (+ secondary_aggregation)
//   gauge      — target_value (+ optional max_value)
//   bullet     — target_value (+ optional max_value)
export const CHART_TYPES = [
  'bar',
  'line',
  'donut',
  'stacked_bar',
  'area',
  'gauge',
  'funnel',
  'treemap',
  'scatter',
  'combo',
  'heatmap',
  'bullet',
  'table',
] as const

export const CohortSizeChart = memo(function CohortSizeChart({ data }: { data: { year: string; count: number }[] }) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={tc.gridline} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
        <Bar dataKey="count" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
})

function NotConfiguredState() {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
      This chart isn't configured yet — set the required columns in Edit KPI.
    </div>
  )
}

// A permanent, always-visible legend for donut/pie charts (colored dot + "Label — value"
// per segment) — additive to the hover tooltip, not a replacement. Positions itself beside
// the donut when the card is wider than it is tall, and below it when the card is taller
// than it is wide, transitioning smoothly as the card is resized in edit mode, via its own
// ResizeObserver on the wrapping container (the same pattern KpiGrid uses for grid width).
function DonutWithLegend({
  data,
  colors,
  defaultColor,
  compact,
  tc,
  tooltipStyle,
}: {
  data: { name: string; value: number }[]
  colors?: Record<string, string>
  defaultColor?: string
  compact: boolean
  tc: ReturnType<typeof getChartTextColors>
  tooltipStyle: ReturnType<typeof useTooltipStyle>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isWide, setIsWide] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setIsWide(width >= height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full w-full gap-2 transition-[flex-direction] duration-200', isWide ? 'flex-row items-center' : 'flex-col')}
    >
      <div className={cn('min-h-0 min-w-0', isWide ? 'h-full flex-1' : 'w-full flex-1')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              // Percentage radii scale with the ResponsiveContainer's actual plotting
              // area (same as the bar charts' width="100%"/height="100%") instead of a
              // fixed pixel size — a fixed radius left a lot of empty card space around
              // a small donut and didn't grow to fill a larger card either.
              innerRadius={compact ? '45%' : '55%'}
              outerRadius={compact ? '70%' : '80%'}
              paddingAngle={2}
              strokeWidth={compact ? 1 : 2}
              stroke={tc.tooltipBg}
              isAnimationActive={!compact}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colors?.[d.name] ?? defaultColor ?? tc.categorical[i % tc.categorical.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {data.length > 0 && (
        <div
          className={cn(
            'flex shrink-0 gap-x-2 gap-y-0.5',
            isWide ? 'max-w-[45%] flex-col justify-center' : 'w-full flex-row flex-wrap justify-center',
          )}
        >
          {data.map((d, i) => {
            const color = colors?.[d.name] ?? defaultColor ?? tc.categorical[i % tc.categorical.length]
            return (
              <div
                key={d.name}
                className={cn('flex min-w-0 items-center gap-1 whitespace-nowrap', compact ? 'text-[9px]' : 'text-xs')}
                style={{ color: tc.tick }}
              >
                <span className={cn('inline-block shrink-0 rounded-full', compact ? 'size-1.5' : 'size-2.5')} style={{ background: color }} />
                <span className="truncate" dir="auto">
                  {d.name} — {d.value.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Custom-built matrix of colored cells (e.g. pass rate by program x level) — not a native
// recharts chart type. Cell shading is the primary color at an opacity proportional to the
// value's share of the matrix's max, so it stays readable in both light and dark themes.
function HeatmapGrid({
  data,
  rowKeys,
  seriesKeys,
  color,
  compact,
}: {
  data: { row: string; col: string; value: number }[]
  rowKeys: string[]
  seriesKeys: string[]
  color: string
  compact: boolean
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const valueByCell = new Map(data.map((d) => [`${d.row} ${d.col}`, d.value]))
  return (
    <div className="h-full w-full overflow-auto text-xs">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `minmax(3.5rem, auto) repeat(${seriesKeys.length}, minmax(2.5rem, 1fr))` }}
      >
        <div />
        {seriesKeys.map((col) => (
          <div key={col} className="truncate px-1 pb-1 text-center font-medium text-muted-foreground">
            {col}
          </div>
        ))}
        {rowKeys.map((row) => (
          <div key={row} className="contents">
            <div className="truncate pr-2 py-0.5 font-medium text-muted-foreground" dir="auto">
              {row}
            </div>
            {seriesKeys.map((col) => {
              const value = valueByCell.get(`${row} ${col}`) ?? 0
              return (
                <div
                  key={col}
                  className="flex items-center justify-center rounded text-[10px] font-medium"
                  style={{ backgroundColor: color, opacity: 0.12 + (value / max) * 0.78, minHeight: compact ? 18 : 26 }}
                  title={`${row} / ${col}: ${value}`}
                >
                  {value}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// A compact bar showing a value against a target in one thin strip — actual value as a
// filled bar, target as a vertical marker line, both against the same 0..max scale.
function BulletGraph({ value, target, max, color }: { value: number; target: number; max: number; color: string }) {
  const safeMax = max > 0 ? max : Math.max(value, target, 1)
  const valuePct = Math.min(100, (value / safeMax) * 100)
  const targetPct = Math.min(100, (target / safeMax) * 100)
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-3">
      <div className="relative h-4 w-full rounded bg-muted">
        <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${valuePct}%`, background: color }} />
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${targetPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{value.toLocaleString()}</span>
        <span>Target: {target.toLocaleString()}</span>
      </div>
    </div>
  )
}

// A semi-circular progress gauge (RadialBarChart with a 180°→0° sweep) showing a single
// value against a target/range — used in place of a plain number+bar when the person wants
// a needle/arc read at a glance.
function Gauge({ value, max, color, compact }: { value: number; max: number; color: string; compact: boolean }) {
  const safeMax = max > 0 ? max : Math.max(value, 1)
  const data = [{ name: 'value', value: Math.min(value, safeMax), fill: color }]
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
          barSize={compact ? 10 : 16}
        >
          <PolarAngleAxis type="number" domain={[0, safeMax]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={8} isAnimationActive={!compact} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[10%] text-center font-semibold text-foreground"
        style={{ fontSize: compact ? 14 : 22 }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  )
}

// A small ranked list embedded in a card — generalizes the Dean's List pattern to any
// grouped/ranked {name,value}[] data via module_kpis, instead of that being a one-off.
function CompactTableList({ data, compact, color }: { data: { name: string; value: number }[]; compact: boolean; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const rows = data.slice(0, compact ? 5 : 10)
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 overflow-auto px-1">
      {rows.map((d) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate text-muted-foreground" dir="auto" title={d.name}>
            {d.name}
          </span>
          <div className="h-2 min-w-0 flex-1 rounded-full bg-muted">
            <div className="h-2 rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-10 shrink-0 text-right font-medium text-foreground">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

/** Renders a `display_type: 'breakdown'` module_kpis row — a top-line number (same look as a
 * plain number KpiCard) plus a row of small labeled sub-values underneath (e.g. per-level or
 * per-program GPA). See kpiEngine's computeBreakdownData for how the data gets here — always
 * an aggregation='custom' lookup, since every breakdown so far needs derived logic (graduated-
 * status bucketing, per-program ranking) the generic engine doesn't express. */
export function BreakdownKpiCard({
  title,
  topLabel,
  topValue,
  segments,
}: {
  title: string
  topLabel: string
  topValue: string
  segments: { label: string; value: string }[]
}) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{topLabel}</p>
          <p className="text-2xl font-semibold text-foreground">{topValue}</p>
        </div>
        {segments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-2">
            {segments.map((s) => (
              <div key={s.label} className="min-w-0 flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center">
                <p className="truncate text-[11px] text-muted-foreground" dir="auto" title={s.label}>
                  {s.label}
                </p>
                <p className="text-sm font-medium text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Renders any `display_type: 'chart'` module_kpis row — see CHART_TYPES above for the
 * full list and what each one needs. Data shape varies by chart_type: most are
 * {name,value}[] (from kpiEngine's computeGroupedKpiData), stacked_bar/heatmap use
 * seriesKeys/rowKeys for a second dimension, scatter is {x,y}[], gauge/bullet use
 * gaugeValue/target/max instead of `data` at all.
 *
 * Memoized: KpiGrid re-renders every chart card on every drag/resize of *any* sibling (grid
 * position isn't part of this component's props), and re-mounting Recharts' internal chart
 * state store that often was enough churn to trip its own "Maximum update depth exceeded"
 * loop during a drag gesture — memoizing skips that re-render whenever this chart's own
 * props haven't actually changed. */
export const GenericKpiChart = memo(function GenericKpiChart({
  title,
  type,
  data,
  colors,
  defaultColor,
  secondaryColor = CHART_COLORS.navy,
  compact = false,
  hasCategoryColors = true,
  seriesKeys,
  rowKeys,
  gaugeValue,
  target,
  max,
  notConfigured,
}: {
  title: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  colors?: Record<string, string>
  defaultColor?: string
  // combo only: the line series' color (defaultColor covers the bar series).
  secondaryColor?: string
  // Renders at KPI-card footprint instead of full chart-panel size: smaller title, no
  // legend (no room for it), tighter donut radius — used when a chart-type KPI is sized
  // small (see KpiGrid), so pulling a chart into the KPI row reads as a card, not a
  // shrunken full chart.
  compact?: boolean
  // 'bar' only: whether each bar represents a real category (grouped by a column, so a
  // distinct color per bar reads as intentional) or just one series with several bars (a
  // bucket_width histogram like Score Distribution) — the latter should render every bar in
  // the same single color instead of cycling through the category palette. Every other
  // chart type that reaches this component always has real categories, so this defaults to
  // true and only KpiGrid (which knows the underlying kpi's config) ever passes false.
  hasCategoryColors?: boolean
  seriesKeys?: string[]
  rowKeys?: string[]
  gaugeValue?: number
  target?: number | null
  max?: number | null
  notConfigured?: boolean
}) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()
  const gradientId = useId()
  // Single-series chart types (no per-category coloring) always need *some* concrete
  // color — this is the only place CHART_COLORS.gold gets applied as a bare fallback.
  // Categorical types (bar/donut/funnel/treemap/stacked_bar below) deliberately keep
  // `defaultColor` un-defaulted so they can tell "admin explicitly set one color for every
  // bar" apart from "nothing set, fall back to cycling colors" — collapsing that
  // distinction here would make every never-customized categorical chart render solid gold
  // instead of the same cycling palette the Edit KPI dialog already previews.
  const singleColor = defaultColor ?? CHART_COLORS.gold

  let body: React.ReactNode
  if (notConfigured) {
    body = <NotConfiguredState />
  } else if (type === 'donut') {
    body = <DonutWithLegend data={data} colors={colors} defaultColor={defaultColor} compact={compact} tc={tc} tooltipStyle={tooltipStyle} />
  } else if (type === 'heatmap') {
    body = <HeatmapGrid data={data} rowKeys={rowKeys ?? []} seriesKeys={seriesKeys ?? []} color={singleColor} compact={compact} />
  } else if (type === 'bullet') {
    body = <BulletGraph value={gaugeValue ?? 0} target={target ?? 0} max={max ?? 1} color={singleColor} />
  } else if (type === 'gauge') {
    body = <Gauge value={gaugeValue ?? 0} max={max ?? 1} color={singleColor} compact={compact} />
  } else if (type === 'table') {
    body = <CompactTableList data={data} compact={compact} color={singleColor} />
  } else if (type === 'line') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tc.gridline} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} />
          <Line type="monotone" dataKey="value" stroke={singleColor} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  } else if (type === 'area') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={singleColor} stopOpacity={0.5} />
              <stop offset="95%" stopColor={singleColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={tc.gridline} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} />
          <Area type="monotone" dataKey="value" stroke={singleColor} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    )
  } else if (type === 'stacked_bar') {
    const keys = seriesKeys ?? []
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tc.gridline} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
          {!compact && <Legend wrapperStyle={{ fontSize: 11, color: tc.tick }} />}
          {keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={colors?.[key] ?? defaultColor ?? tc.categorical[i % tc.categorical.length]}
              radius={i === keys.length - 1 ? [4, 4, 0, 0] : undefined}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  } else if (type === 'combo') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tc.gridline} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
          {!compact && <Legend wrapperStyle={{ fontSize: 11, color: tc.tick }} />}
          <Bar yAxisId="left" dataKey="value" fill={singleColor} radius={[4, 4, 0, 0]} maxBarSize={40} name={title} />
          <Line yAxisId="right" type="monotone" dataKey="secondaryValue" stroke={secondaryColor} strokeWidth={2} dot={{ r: 3 }} name="Secondary" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  } else if (type === 'scatter') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={tc.gridline} />
          <XAxis type="number" dataKey="x" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={singleColor} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  } else if (type === 'funnel') {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} />
          <Funnel data={data} dataKey="value" nameKey="name" isAnimationActive={!compact}>
            {!compact && <LabelList position="right" dataKey="name" fill={tc.tick} stroke="none" fontSize={11} />}
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors?.[d.name] ?? defaultColor ?? tc.categorical[i % tc.categorical.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    )
  } else if (type === 'treemap') {
    const colored = data.map((d, i) => ({
      ...d,
      fill: colors?.[d.name] ?? defaultColor ?? tc.categorical[i % tc.categorical.length],
    }))
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={colored} dataKey="value" nameKey="name" stroke={tc.tooltipBg} isAnimationActive={!compact}>
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} />
        </Treemap>
      </ResponsiveContainer>
    )
  } else {
    // 'bar' and any unrecognized-but-configured value fall back to a plain bar chart.
    // Grouped-by-a-column bars (hasCategoryColors) cycle through the category palette when
    // nothing's explicitly saved, matching donut/funnel/treemap's fallback and the Edit KPI
    // dialog's own category-color preview. A single-series bar chart (no real category —
    // e.g. a bucket_width histogram like Score Distribution) instead paints every bar the
    // same single color, same as line/area/etc. — it has no "categories" to cycle through.
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tc.gridline} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={
                  hasCategoryColors ? (colors?.[d.name] ?? defaultColor ?? tc.categorical[i % tc.categorical.length]) : singleColor
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card size="sm" className="h-full">
      <CardHeader className={compact ? 'pb-0' : 'pb-1'}>
        <CardTitle className={compact ? '!text-[11px] truncate leading-tight text-muted-foreground' : 'text-sm'}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">{body}</CardContent>
    </Card>
  )
})

export const GpaByBatchChart = memo(function GpaByBatchChart({ data }: { data: { batch: string; gpa: number }[] }) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={tc.gridline} />
        <XAxis dataKey="batch" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: tc.tick, fontSize: 12 }}
          domain={[0, 4]}
        />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
        <Bar dataKey="gpa" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
})
