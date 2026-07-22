import { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  hexToHsv,
  hexToRgb,
  hsvToHex,
  loadSavedSwatches,
  noteSavedSwatch,
  normalizeHex,
  rgbToHex,
} from '@/lib/color'

const DEFAULT_SWATCH = '#F39F5A'

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/** Full graphic color picker: a saturation/value gradient square + hue slider for visual
 * selection, hex/RGB fields for exact values, a "new vs previous" pair of swatches (click
 * previous to revert to whatever this color was when the popover was opened), and a
 * cross-KPI saved-swatches palette persisted in localStorage. Replaces the earlier bare
 * native-color-input + hex popover — this is deliberately a standalone component (not a
 * one-line tweak) since it owns real pointer-drag interaction and its own persisted state. */
export function ColorPickerPopover({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (hex: string) => void
  label: string
}) {
  const current = value || DEFAULT_SWATCH
  const [hsv, setHsv] = useState(() => hexToHsv(current))
  const [hexInput, setHexInput] = useState(current)
  const [rgbText, setRgbText] = useState(() => {
    const [r, g, b] = hexToRgb(current)
    return { r: String(r), g: String(g), b: String(b) }
  })
  const [previousColor, setPreviousColor] = useState(current)
  const [savedSwatches, setSavedSwatches] = useState<string[]>([])
  const squareRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // Re-derive h/s/v from an externally-changed value (typed hex/RGB, "previous" click, or a
  // different kpi/category loading into this same instance) — but only when it didn't
  // originate from our own hsv state, so dragging saturation to 0 (which makes hue
  // ambiguous) doesn't reset a hue the person just picked.
  useEffect(() => {
    const next = current
    const fromOwnState = hsvToHex(...hsv).toUpperCase() === next.toUpperCase()
    if (!fromOwnState) setHsv(hexToHsv(next))
    setHexInput(next)
    const [r, g, b] = hexToRgb(next)
    setRgbText({ r: String(r), g: String(g), b: String(b) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const [hue, sat, val] = hsv
  const hex = hsvToHex(hue, sat, val)

  function commitHsv(next: [number, number, number]) {
    setHsv(next)
    onChange(hsvToHex(...next))
  }

  function pickFromSquare(clientX: number, clientY: number) {
    const rect = squareRef.current?.getBoundingClientRect()
    if (!rect) return
    const s = clamp01((clientX - rect.left) / rect.width) * 100
    const v = (1 - clamp01((clientY - rect.top) / rect.height)) * 100
    commitHsv([hue, s, v])
  }

  function pickFromHueSlider(clientX: number) {
    const rect = hueRef.current?.getBoundingClientRect()
    if (!rect) return
    const h = clamp01((clientX - rect.left) / rect.width) * 360
    commitHsv([h, sat, val])
  }

  function commitHex(nextHex: string) {
    onChange(nextHex)
  }

  function commitRgbChannel(channel: 'r' | 'g' | 'b', text: string) {
    const next = { ...rgbText, [channel]: text }
    setRgbText(next)
    const r = Number(next.r)
    const g = Number(next.g)
    const b = Number(next.b)
    if ([r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      onChange(rgbToHex(r, g, b))
    }
  }

  function finalizeColor(finalHex: string) {
    setSavedSwatches(noteSavedSwatch(finalHex))
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          setPreviousColor(current)
          setSavedSwatches(loadSavedSwatches())
        } else {
          finalizeColor(current)
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="size-9 shrink-0 overflow-hidden rounded-md border border-input p-0"
          />
        }
      >
        <span className="block size-full" style={{ background: current }} />
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3" align="start">
        <div
          ref={squareRef}
          className="relative h-[140px] w-full shrink-0 cursor-crosshair touch-none overflow-hidden rounded-md border border-input"
          style={{ background: `hsl(${hue}, 100%, 50%)` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pickFromSquare(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return
            pickFromSquare(e.clientX, e.clientY)
          }}
          onPointerUp={() => finalizeColor(hex)}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
          <div
            className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${sat}%`, bottom: `${val}%`, background: hex }}
          />
        </div>

        <div
          ref={hueRef}
          className="relative h-3 w-full shrink-0 cursor-pointer touch-none rounded-full"
          style={{
            background:
              'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pickFromHueSlider(e.clientX)
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return
            pickFromHueSlider(e.clientX)
          }}
          onPointerUp={() => finalizeColor(hex)}
        >
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue}, 100%, 50%)` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">New</span>
          <span className="size-6 shrink-0 rounded border border-input" style={{ background: hex }} />
          <span className="text-xs text-muted-foreground">Previous</span>
          <button
            type="button"
            onClick={() => commitHex(previousColor)}
            className="size-6 shrink-0 rounded border border-input"
            style={{ background: previousColor }}
            aria-label="Revert to previous color"
            title="Click to revert to the color this was before you opened the picker"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-xs text-muted-foreground">Hex</span>
          <Input
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value)
              const normalized = normalizeHex(e.target.value)
              if (normalized) commitHex(normalized)
            }}
            onBlur={() => setHexInput(current)}
            className="h-7 flex-1 font-mono text-xs"
            placeholder="#AABBCC"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-xs text-muted-foreground">RGB</span>
          <div className="flex flex-1 gap-1">
            {(['r', 'g', 'b'] as const).map((channel) => (
              <Input
                key={channel}
                type="number"
                min={0}
                max={255}
                value={rgbText[channel]}
                onChange={(e) => commitRgbChannel(channel, e.target.value)}
                onBlur={() => finalizeColor(hex)}
                className="h-7 w-full px-1 text-center font-mono text-xs"
                aria-label={`${channel.toUpperCase()} value`}
              />
            ))}
          </div>
        </div>

        {savedSwatches.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Saved swatches</span>
            <div className="flex flex-wrap gap-1">
              {savedSwatches.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  type="button"
                  onClick={() => commitHex(c)}
                  className="size-5 shrink-0 overflow-hidden rounded border border-input p-0"
                  style={{ background: c }}
                  aria-label={`Use saved color ${c}`}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
