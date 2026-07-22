import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChartTextColors, useTooltipStyle } from '@/components/dashboard/DashboardCharts'
import { GRADE_LETTERS } from '@/lib/grades'
import type { Student } from '@/hooks/useStudents'
import type { Result } from '@/hooks/useResults'
import { exportCsv } from '@/lib/export-csv'

const LEVELS = [1, 2, 3]

interface GroupMetrics {
  key: string
  studentCount: number
  avgGpa: number | null
  passRate: number | null
  failRate: number | null
  gradeCounts: Record<string, number>
}

function avgOf(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

function metricsFor(key: string, groupStudents: Student[], groupResults: Result[]): GroupMetrics {
  const passed = groupResults.filter((r) => r.status === 'Passed').length
  const failed = groupResults.filter((r) => r.status === 'Failed').length
  return {
    key,
    studentCount: groupStudents.length,
    avgGpa: avgOf(groupStudents.map((s) => s.gpa).filter((g): g is number => g != null)),
    passRate: groupResults.length ? (passed / groupResults.length) * 100 : null,
    failRate: groupResults.length ? (failed / groupResults.length) * 100 : null,
    gradeCounts: Object.fromEntries(GRADE_LETTERS.map((g) => [g, groupResults.filter((r) => r.grade_letter === g).length])),
  }
}

function pct(n: number | null): string {
  return n != null ? `${n.toFixed(1)}%` : '—'
}
function fmt(n: number | null): string {
  return n != null ? n.toFixed(2) : '—'
}

function MetricsSection({
  title,
  groups,
  filename,
  colLabel,
}: {
  title: string
  groups: GroupMetrics[]
  filename: string
  colLabel: string
}) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()

  const chartData = GRADE_LETTERS.map((g) => {
    const row: Record<string, string | number> = { name: g }
    for (const group of groups) row[group.key] = group.gradeCounts[g] ?? 0
    return row
  })

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">{title}</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={groups.length === 0}
          onClick={() =>
            exportCsv(
              filename,
              [colLabel, 'Student Count', 'Avg GPA', 'Pass Rate %', 'Fail Rate %', ...GRADE_LETTERS],
              groups.map((g) => [
                g.key,
                g.studentCount,
                fmt(g.avgGpa),
                g.passRate != null ? g.passRate.toFixed(1) : '',
                g.failRate != null ? g.failRate.toFixed(1) : '',
                ...GRADE_LETTERS.map((letter) => g.gradeCounts[letter] ?? 0),
              ]),
            )
          }
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{colLabel}</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Avg GPA</TableHead>
            <TableHead>Pass Rate</TableHead>
            <TableHead>Fail Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.key}>
              <TableCell dir="auto">{g.key}</TableCell>
              <TableCell>{g.studentCount}</TableCell>
              <TableCell className="font-medium">{fmt(g.avgGpa)}</TableCell>
              <TableCell>{pct(g.passRate)}</TableCell>
              <TableCell>{pct(g.failRate)}</TableCell>
            </TableRow>
          ))}
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Not enough data to compare yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {groups.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={tc.gridline} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: tc.tooltipText }}
                labelStyle={{ color: tc.tooltipText }}
                cursor={{ fill: tc.tooltipCursor }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: tc.tick }} />
              {groups.map((g, i) => (
                <Bar key={g.key} dataKey={g.key} fill={tc.categorical[i % tc.categorical.length]} radius={[4, 4, 0, 0]} maxBarSize={32} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export function ComparativeAnalysisReport({ students, results }: { students: Student[]; results: Result[] }) {
  const byLevel = useMemo(
    () =>
      LEVELS.map((level) =>
        metricsFor(`Level ${level}`, students.filter((s) => s.level === level), results.filter((r) => r.level === level)),
      ),
    [students, results],
  )

  const byBatch = useMemo(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const batches = Array.from(new Set(students.map((s) => s.batch).filter((b): b is string => !!b))).sort()
    return batches.map((batch) =>
      metricsFor(
        batch,
        students.filter((s) => s.batch === batch),
        results.filter((r) => studentById.get(r.student_id)?.batch === batch),
      ),
    )
  }, [students, results])

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Side-by-side comparison of academic levels and admission batches — GPA, pass/fail rate, and grade
        distribution.
      </p>
      <MetricsSection title="Levels compared" groups={byLevel} filename="comparative_levels.csv" colLabel="Level" />
      <MetricsSection title="Admission batches compared" groups={byBatch} filename="comparative_batches.csv" colLabel="Batch" />
    </div>
  )
}
