import { useMemo, useState } from 'react'
import { Download, Palette } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorPickerPopover } from '@/components/dashboard/ColorPickerPopover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChartTextColors, useTooltipStyle } from '@/components/dashboard/DashboardCharts'
import type { Student } from '@/hooks/useStudents'
import type { Result } from '@/hooks/useResults'
import { exportCsv } from '@/lib/export-csv'
import {
  getBatchColor,
  loadCohortColorOverrides,
  resetCohortColorOverride,
  saveCohortColorOverride,
} from '@/lib/chart-colors'

const LEVELS = [1, 2, 3]
// A batch with only a handful of students produces a noisy, not-really-meaningful average —
// this is the "only meaningful batches with enough data shown" cutoff from the brief.
const MIN_BATCH_SIZE = 3

function fmt(n: number | null): string {
  return n != null ? n.toFixed(2) : '—'
}

export function CohortTrackingReport({ students, results }: { students: Student[]; results: Result[] }) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()
  const [colorOverrides, setColorOverrides] = useState(() => loadCohortColorOverrides())

  const { batches, chartData, table } = useMemo(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const batchCounts = new Map<string, number>()
    for (const s of students) {
      if (!s.batch) continue
      batchCounts.set(s.batch, (batchCounts.get(s.batch) ?? 0) + 1)
    }
    const meaningfulBatches = Array.from(batchCounts.entries())
      .filter(([, count]) => count >= MIN_BATCH_SIZE)
      .map(([batch]) => batch)
      .sort()

    // Per-level average grade_points (a 0-4 scale, same as GPA) among a batch's own course
    // results at that level — this is what actually varies by level, unlike students.gpa
    // (a single current cumulative number), so it's what lets a batch's progression across
    // levels show up as a real trend line instead of a flat one.
    const perBatchPerLevel = new Map<string, Map<number, number | null>>()
    for (const batch of meaningfulBatches) {
      const levelMap = new Map<number, number | null>()
      for (const level of LEVELS) {
        const matching = results.filter((r) => r.level === level && studentById.get(r.student_id)?.batch === batch)
        const avg = matching.length
          ? matching.reduce((sum, r) => sum + Number(r.grade_points), 0) / matching.length
          : null
        levelMap.set(level, avg)
      }
      perBatchPerLevel.set(batch, levelMap)
    }

    const chartData = LEVELS.map((level) => {
      const row: Record<string, string | number> = { name: `Level ${level}` }
      for (const batch of meaningfulBatches) row[batch] = perBatchPerLevel.get(batch)?.get(level) ?? 0
      return row
    })

    const table = meaningfulBatches.map((batch) => ({
      batch,
      studentCount: batchCounts.get(batch) ?? 0,
      byLevel: LEVELS.map((level) => perBatchPerLevel.get(batch)?.get(level) ?? null),
    }))

    return { batches: meaningfulBatches, chartData, table }
  }, [students, results])

  function handleExport() {
    exportCsv(
      'cohort_tracking.csv',
      ['Batch', 'Student Count', ...LEVELS.map((l) => `Level ${l} Avg Grade Points`)],
      table.map((r) => [r.batch, r.studentCount, ...r.byLevel.map((v) => fmt(v))]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Average per-course grade points (0–4 scale), by admission batch, at each level — how each cohort
          performed as it progressed. Batches with fewer than {MIN_BATCH_SIZE} students are omitted.
        </p>
        <div className="flex shrink-0 gap-2">
          {batches.length > 0 && (
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Palette className="size-4" />
                    Line colors
                  </Button>
                }
              />
              <PopoverContent className="w-72 gap-3" align="end">
                <p className="text-xs text-muted-foreground">Customize each batch's line color.</p>
                <div className="space-y-2">
                  {batches.map((batch, i) => (
                    <div key={batch} className="flex items-center justify-between gap-2">
                      <span className="text-sm" dir="auto">
                        {batch}
                      </span>
                      <div className="flex items-center gap-1">
                        <ColorPickerPopover
                          value={getBatchColor(batch, i, colorOverrides)}
                          onChange={(hex) => setColorOverrides(saveCohortColorOverride(batch, hex))}
                          label={`${batch} line color`}
                        />
                        {colorOverrides[batch] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-xs"
                            onClick={() => setColorOverrides(resetCohortColorOverride(batch))}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={batches.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough batch data yet to show a trend.</p>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={tc.gridline} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
                <YAxis domain={[0, 4]} tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: tc.tooltipText }}
                  labelStyle={{ color: tc.tooltipText }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: tc.tick }} />
                {batches.map((batch, i) => (
                  <Line
                    key={batch}
                    type="monotone"
                    dataKey={batch}
                    stroke={getBatchColor(batch, i, colorOverrides)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Students</TableHead>
                {LEVELS.map((l) => (
                  <TableHead key={l} className="text-center">
                    Level {l}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.map((r) => (
                <TableRow key={r.batch}>
                  <TableCell dir="auto">{r.batch}</TableCell>
                  <TableCell>{r.studentCount}</TableCell>
                  {r.byLevel.map((v, i) => (
                    <TableCell key={i} className="text-center">
                      {fmt(v)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
