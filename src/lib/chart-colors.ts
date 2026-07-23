// Mirrors the CSS custom properties in index.css (light-mode values — these fill colors
// are shared across both themes rather than fully duplicated, since the plum/rose/amber
// family already has enough mid-tone saturation to read on both a light and a dark
// background; only the axis/tooltip/gridline text below is genuinely theme-aware, since
// those are the elements that actually risk illegibility — see getChartTextColors).
// Recharts renders to SVG, so literal hex values here are more reliable across browsers
// than var().
export const CHART_COLORS = {
  navy: '#662549', // key name kept for compat; value is now "plum" (mid-tone, not plum-deep)
  navyMuted: '#AE445A', // "rose"
  gold: '#F39F5A', // "amber"
  goldSoft: '#FBE3CB',
  success: '#2F9E68',
  danger: '#D64545',
  gridline: 'rgba(69, 25, 82, 0.08)',
} as const

// The house category-color palette — every chart-type module_kpis row with per-category
// coloring (bar/donut/funnel/treemap by group_by_column, stacked_bar by group_by_column_2)
// cycles through exactly these 4 colors, in this order, whenever a category doesn't have an
// explicitly-saved color of its own. Kept to these 4 (not the larger 6-color set this used
// to include) per the house palette — a single-color chart defaults to the last one,
// CHART_COLORS.gold, instead.
export const CATEGORICAL_ORDER = ['#451952', CHART_COLORS.navy, CHART_COLORS.navyMuted, CHART_COLORS.gold] as const

// #451952/#662549 (the darkest two of the light palette) are near-invisible against a dark
// card background — this is the dark-mode-only substitute, brighter/more saturated variants
// of the same plum/rose/amber family so it still reads as "the same brand," just legible on
// a dark surface. Only used for AUTO-ASSIGNED category colors (the CATEGORICAL_ORDER
// fallback below) — any color a person has actually saved to value_colors/default_color is a
// deliberate choice and is rendered as-is in both themes, never swapped. #F39F5A (amber)
// appears in both arrays unchanged since it already reads fine on light and dark alike.
export const CATEGORICAL_ORDER_DARK = ['#9B59B6', '#C0392B', '#E74C8A', '#F39F5A', '#F1C40F', '#2ECC71'] as const

export function getCategoricalOrder(dark: boolean): readonly string[] {
  return dark ? CATEGORICAL_ORDER_DARK : CATEGORICAL_ORDER
}

// Cohort Tracking's per-batch line colors need a much wider spread than CATEGORICAL_ORDER
// (which is 4 near-identical dark plum/maroon shades — fine for a handful of KPI-chart
// categories, but nearly indistinguishable as 6 simultaneous line-chart traces in light mode).
// These are deliberately spread across the full hue wheel — not just the house plum/rose/amber
// family — so all 6 admission batches stay distinguishable in both themes. Keyed by the exact
// batch string so real data lines up; BATCH_COLOR_FALLBACK_CYCLE covers any batch beyond these.
export const BATCH_COLORS: Record<string, string> = {
  '2017/2018': '#451952',
  '2018/2019': '#E74C3C',
  '2019/2020': '#F39F5A',
  '2020/2021': '#2ECC71',
  '2021/2022': '#3498DB',
  '2022/2023': '#9B59B6',
}
export const BATCH_COLOR_FALLBACK_CYCLE = Object.values(BATCH_COLORS)

// User-customizable overrides for BATCH_COLORS, session-and-browser-persisted (not tied to any
// module_kpis row, since batches are derived from students.batch rather than a KPI's own
// category dimension) — mirrors the ColorPickerPopover-driven per-category color editing KPI
// charts already have, so Cohort Tracking's lines aren't the one uneditable chart in the app.
const COHORT_COLOR_OVERRIDES_KEY = 'ctds-cohort-batch-color-overrides'

export function loadCohortColorOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COHORT_COLOR_OVERRIDES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistCohortColorOverrides(next: Record<string, string>) {
  try {
    localStorage.setItem(COHORT_COLOR_OVERRIDES_KEY, JSON.stringify(next))
  } catch {
    // Storage full or unavailable (private browsing) — customization just won't persist.
  }
}

export function saveCohortColorOverride(batch: string, hex: string): Record<string, string> {
  const next = { ...loadCohortColorOverrides(), [batch]: hex }
  persistCohortColorOverrides(next)
  return next
}

export function resetCohortColorOverride(batch: string): Record<string, string> {
  const next = { ...loadCohortColorOverrides() }
  delete next[batch]
  persistCohortColorOverrides(next)
  return next
}

export function getBatchColor(
  batch: string,
  index: number,
  overrides: Record<string, string>,
): string {
  return (
    overrides[batch] ??
    BATCH_COLORS[batch] ??
    BATCH_COLOR_FALLBACK_CYCLE[index % BATCH_COLOR_FALLBACK_CYCLE.length]
  )
}

export const GRADE_COLORS: Record<string, string> = {
  A: CHART_COLORS.success,
  B: CHART_COLORS.success,
  C: CHART_COLORS.gold,
  D: CHART_COLORS.gold,
  F: CHART_COLORS.danger,
  Abs: CHART_COLORS.navyMuted,
}

// Axis ticks/tooltip/gridline need to flip with the theme (dark plum text on a dark
// background would be invisible) — call from a component that already knows the current
// theme (see DashboardCharts.tsx's useChartTextColors). `categorical` is the theme-appropriate
// auto-assigned category palette (see getCategoricalOrder) — bundled here so a chart only
// needs this one call to get every theme-aware value it needs.
export function getChartTextColors(dark: boolean) {
  return dark
    ? {
        tick: '#C9A8BC',
        gridline: 'rgba(255, 255, 255, 0.08)',
        tooltipBg: '#251530',
        tooltipBorder: 'rgba(255, 255, 255, 0.12)',
        tooltipText: '#F3E8EE',
        tooltipCursor: 'rgba(255, 255, 255, 0.06)',
        categorical: CATEGORICAL_ORDER_DARK as readonly string[],
      }
    : {
        tick: '#7A5568',
        gridline: 'rgba(69, 25, 82, 0.08)',
        tooltipBg: '#FFFFFF',
        tooltipBorder: 'rgba(69, 25, 82, 0.12)',
        tooltipText: '#451952',
        tooltipCursor: 'rgba(69, 25, 82, 0.04)',
        categorical: CATEGORICAL_ORDER as readonly string[],
      }
}
