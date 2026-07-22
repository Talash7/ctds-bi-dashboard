// Small, dependency-free color-space conversions shared by the dashboard's color picker
// (ColorPickerPopover) — hex is the storage format (module_kpis.default_color/value_colors),
// HSV is what the saturation/value square and hue slider manipulate, RGB is what the RGB
// number fields show.

export function normalizeHex(v: string): string | null {
  const trimmed = v.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase()
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return [h, s * 100, v * 100]
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

export function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHsv(r, g, b)
}

export function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

// A small cross-KPI "saved swatches" palette (item 6 of the color-picker redesign brief) —
// persisted in localStorage (not per-dialog-session state) so a color picked while editing
// one KPI is still one click away when editing a different one later, without reintroducing
// the fixed dashboard-theme palette shortcuts that were removed. Capped and de-duplicated,
// most-recently-used first.
const SAVED_SWATCHES_KEY = 'ctds-color-picker-saved-swatches'
const MAX_SAVED_SWATCHES = 24

export function loadSavedSwatches(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_SWATCHES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function noteSavedSwatch(hex: string): string[] {
  const next = [hex, ...loadSavedSwatches().filter((c) => c !== hex)].slice(0, MAX_SAVED_SWATCHES)
  try {
    localStorage.setItem(SAVED_SWATCHES_KEY, JSON.stringify(next))
  } catch {
    // Storage full or unavailable (private browsing) — the picker still works, it just
    // won't remember swatches across sessions.
  }
  return next
}
