import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChartTextColors, useTooltipStyle } from '@/components/dashboard/DashboardCharts'
import type { Program } from '@/hooks/usePrograms'
import type { Student } from '@/hooks/useStudents'
import { exportCsv } from '@/lib/export-csv'

const LEVELS = [1, 2, 3]

const GPA_BANDS = [
  { label: '0 - 0.99', min: 0, max: 0.99 },
  { label: '1.0 - 1.99', min: 1.0, max: 1.99 },
  { label: '2.0 - 2.49', min: 2.0, max: 2.49 },
  { label: '2.5 - 2.99', min: 2.5, max: 2.99 },
  { label: '3.0 - 3.49', min: 3.0, max: 3.49 },
  { label: '3.5 - 4.0', min: 3.5, max: 4.0 },
]

function gpaStats(list: Student[]) {
  const gpas = list
    .map((s) => s.gpa)
    .filter((g): g is number => g != null)
    .sort((a, b) => a - b)
  if (gpas.length === 0) return { count: list.length, avg: null as number | null, min: null as number | null, max: null as number | null, median: null as number | null }
  const avg = gpas.reduce((sum, g) => sum + g, 0) / gpas.length
  const mid = Math.floor(gpas.length / 2)
  const median = gpas.length % 2 ? gpas[mid] : (gpas[mid - 1] + gpas[mid]) / 2
  return { count: list.length, avg, min: gpas[0], max: gpas[gpas.length - 1], median }
}

function fmt(n: number | null): string {
  return n != null ? n.toFixed(2) : '—'
}

export function GpaAnalysisReport({ students, programs }: { students: Student[]; programs: Program[] }) {
  const [programFilter, setProgramFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()

  const admissionYears = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.admission_year).filter((y): y is number => y != null))).sort(
        (a, b) => b - a,
      ),
    [students],
  )

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          (programFilter === 'all' || s.program_id === programFilter) &&
          (levelFilter === 'all' || String(s.level) === levelFilter) &&
          (yearFilter === 'all' || String(s.admission_year) === yearFilter),
      ),
    [students, programFilter, levelFilter, yearFilter],
  )

  const byLevel = useMemo(
    () => LEVELS.map((level) => ({ level, ...gpaStats(filtered.filter((s) => s.level === level)) })),
    [filtered],
  )

  const byProgram = useMemo(
    () => programs.map((p) => ({ program: p, ...gpaStats(filtered.filter((s) => s.program_id === p.id)) })),
    [filtered, programs],
  )

  const pivot = useMemo(
    () =>
      programs.map((p) => ({
        program: p,
        cells: LEVELS.map((level) => gpaStats(filtered.filter((s) => s.program_id === p.id && s.level === level)).avg),
      })),
    [filtered, programs],
  )

  const distribution = useMemo(
    () =>
      GPA_BANDS.map((band) => ({
        name: band.label,
        value: filtered.filter((s) => s.gpa != null && s.gpa >= band.min && s.gpa <= band.max).length,
      })),
    [filtered],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={programFilter} onValueChange={(v) => v && setProgramFilter(v)}>
          <SelectTrigger className="w-48">
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
        <Select value={levelFilter} onValueChange={(v) => v && setLevelFilter(v)}>
          <SelectTrigger className="w-32">
            <SelectValue>{(v: string) => (v === 'all' ? 'All levels' : `Level ${v}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Level {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={(v) => v && setYearFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => (v === 'all' ? 'All admission years' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All admission years</SelectItem>
            {admissionYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filtered.length.toLocaleString()} students match these filters</p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">GPA by Level</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(
                'gpa_by_level.csv',
                ['Level', 'Student Count', 'Avg GPA', 'Min GPA', 'Max GPA', 'Median GPA'],
                byLevel.map((r) => [r.level, r.count, fmt(r.avg), fmt(r.min), fmt(r.max), fmt(r.median)]),
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
              <TableHead>Level</TableHead>
              <TableHead>Student Count</TableHead>
              <TableHead>Avg GPA</TableHead>
              <TableHead>Min GPA</TableHead>
              <TableHead>Max GPA</TableHead>
              <TableHead>Median GPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byLevel.map((r) => (
              <TableRow key={r.level}>
                <TableCell>Level {r.level}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell className="font-medium">{fmt(r.avg)}</TableCell>
                <TableCell>{fmt(r.min)}</TableCell>
                <TableCell>{fmt(r.max)}</TableCell>
                <TableCell>{fmt(r.median)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">GPA by Program</h3>
          <Button
            variant="outline"
            size="sm"
            disabled={byProgram.length === 0}
            onClick={() =>
              exportCsv(
                'gpa_by_program.csv',
                ['Program', 'Student Count', 'Avg GPA', 'Min GPA', 'Max GPA', 'Median GPA'],
                byProgram.map((r) => [r.program.name, r.count, fmt(r.avg), fmt(r.min), fmt(r.max), fmt(r.median)]),
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
              <TableHead>Program</TableHead>
              <TableHead>Student Count</TableHead>
              <TableHead>Avg GPA</TableHead>
              <TableHead>Min GPA</TableHead>
              <TableHead>Max GPA</TableHead>
              <TableHead>Median GPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byProgram.map((r) => (
              <TableRow key={r.program.id}>
                <TableCell dir="auto">{r.program.name}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell className="font-medium">{fmt(r.avg)}</TableCell>
                <TableCell>{fmt(r.min)}</TableCell>
                <TableCell>{fmt(r.max)}</TableCell>
                <TableCell>{fmt(r.median)}</TableCell>
              </TableRow>
            ))}
            {byProgram.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No programs to show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">GPA by Level &amp; Program</h3>
          <Button
            variant="outline"
            size="sm"
            disabled={pivot.length === 0}
            onClick={() =>
              exportCsv(
                'gpa_by_level_and_program.csv',
                ['Program', ...LEVELS.map((l) => `Level ${l}`)],
                pivot.map((r) => [r.program.name, ...r.cells.map((c) => fmt(c))]),
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
              <TableHead>Program</TableHead>
              {LEVELS.map((l) => (
                <TableHead key={l} className="text-center">
                  Level {l}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pivot.map((r) => (
              <TableRow key={r.program.id}>
                <TableCell dir="auto">{r.program.name}</TableCell>
                {r.cells.map((c, i) => (
                  <TableCell key={i} className="text-center">
                    {fmt(c)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {pivot.length === 0 && (
              <TableRow>
                <TableCell colSpan={LEVELS.length + 1} className="text-center text-muted-foreground">
                  No programs to show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">GPA Distribution</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv('gpa_distribution.csv', ['GPA Range', 'Students'], distribution.map((d) => [d.name, d.value]))}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={tc.gridline} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tc.tooltipText }} labelStyle={{ color: tc.tooltipText }} cursor={{ fill: tc.tooltipCursor }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {distribution.map((d, i) => (
                  <Cell key={d.name} fill={tc.categorical[i % tc.categorical.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
