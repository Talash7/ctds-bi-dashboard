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
