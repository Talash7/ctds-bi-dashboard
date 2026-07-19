import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
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
import type { Course } from '@/hooks/useCourses'
import type { Result } from '@/hooks/useResults'
import { exportCsv } from '@/lib/export-csv'
import { GRADE_LETTERS } from '@/lib/grades'

export function GradeDistributionReport({ courses, results }: { courses: Course[]; results: Result[] }) {
  const [levelFilter, setLevelFilter] = useState('all')

  const rows = useMemo(() => {
    const acc: Record<string, Record<string, number>> = {}
    for (const r of results) {
      acc[r.course_id] ??= {}
      acc[r.course_id][r.grade_letter] = (acc[r.course_id][r.grade_letter] ?? 0) + 1
    }
    return courses
      .filter((c) => levelFilter === 'all' || String(c.level) === levelFilter)
      .map((c) => ({ course: c, counts: acc[c.id] ?? {} }))
  }, [courses, results, levelFilter])

  function handleExport() {
    exportCsv(
      'grade_distribution_by_course.csv',
      ['Code', 'Name', 'Level', ...GRADE_LETTERS],
      rows.map((r) => [
        r.course.code,
        r.course.name,
        r.course.level,
        ...GRADE_LETTERS.map((g) => r.counts[g] ?? 0),
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Grade letter breakdown per course.</p>
        <div className="flex items-center gap-3">
          <Select value={levelFilter} onValueChange={(v) => v && setLevelFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => (v === 'all' ? 'All levels' : `Level ${v}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Level</TableHead>
            {GRADE_LETTERS.map((g) => (
              <TableHead key={g} className="text-center">
                {g}
              </TableHead>
            ))}
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
              {GRADE_LETTERS.map((g) => (
                <TableCell key={g} className="text-center">
                  {r.counts[g] ?? 0}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
