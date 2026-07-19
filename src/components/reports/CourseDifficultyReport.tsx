import { useMemo, useState } from 'react'
import { Download, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Course } from '@/hooks/useCourses'
import type { Result } from '@/hooks/useResults'
import { exportCsv } from '@/lib/export-csv'

type SortKey = 'failRate' | 'avgGrade' | 'total'

export function CourseDifficultyReport({ courses, results }: { courses: Course[]; results: Result[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('failRate')

  const rows = useMemo(() => {
    const acc: Record<string, { total: number; failed: number; absent: number; sum: number }> = {}
    for (const r of results) {
      acc[r.course_id] ??= { total: 0, failed: 0, absent: 0, sum: 0 }
      acc[r.course_id].total++
      acc[r.course_id].sum += r.grade_points
      if (r.status === 'Failed') acc[r.course_id].failed++
      if (r.status === 'Absent') acc[r.course_id].absent++
    }

    const list = courses.map((c) => {
      const a = acc[c.id] ?? { total: 0, failed: 0, absent: 0, sum: 0 }
      const dfw = a.failed + a.absent
      return {
        course: c,
        total: a.total,
        failed: a.failed,
        failRate: a.total ? (a.failed / a.total) * 100 : 0,
        dfwRate: a.total ? (dfw / a.total) * 100 : 0,
        avgGrade: a.total ? a.sum / a.total : 0,
      }
    })

    return list.sort((a, b) => {
      if (sortKey === 'failRate') return b.failRate - a.failRate
      if (sortKey === 'avgGrade') return a.avgGrade - b.avgGrade
      return b.total - a.total
    })
  }, [courses, results, sortKey])

  function handleExport() {
    exportCsv(
      'course_difficulty_analysis.csv',
      ['Code', 'Name', 'Level', 'Total Results', 'Fail Count', 'Fail Rate %', 'DFW Rate %', 'Avg Grade Points'],
      rows.map((r) => [
        r.course.code,
        r.course.name,
        r.course.level,
        r.total,
        r.failed,
        r.failRate.toFixed(1),
        r.dfwRate.toFixed(1),
        r.avgGrade.toFixed(2),
      ]),
    )
  }

  function SortableHead({ label, k }: { label: string; k: SortKey }) {
    return (
      <TableHead>
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => setSortKey(k)}
        >
          {label}
          <ArrowUpDown className="size-3" />
        </button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Fail and DFW (D/F/Absent) rates per course, hardest courses first.
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Level</TableHead>
            <SortableHead label="Total" k="total" />
            <TableHead>Fail count</TableHead>
            <SortableHead label="Fail rate" k="failRate" />
            <TableHead>DFW rate</TableHead>
            <SortableHead label="Avg. grade points" k="avgGrade" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.course.id}>
              <TableCell className="font-mono text-sm" dir="auto">
                {r.course.code}
              </TableCell>
              <TableCell dir="auto">{r.course.name}</TableCell>
              <TableCell>{r.course.level}</TableCell>
              <TableCell>{r.total}</TableCell>
              <TableCell>{r.failed}</TableCell>
              <TableCell>{r.failRate.toFixed(1)}%</TableCell>
              <TableCell>{r.dfwRate.toFixed(1)}%</TableCell>
              <TableCell>{r.avgGrade.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
