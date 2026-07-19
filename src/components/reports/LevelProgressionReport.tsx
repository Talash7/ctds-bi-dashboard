import { useMemo } from 'react'
import { Download, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Student } from '@/hooks/useStudents'
import type { Result } from '@/hooks/useResults'
import { exportCsv } from '@/lib/export-csv'

export function LevelProgressionReport({ students, results }: { students: Student[]; results: Result[] }) {
  const rows = useMemo(() => {
    return [1, 2, 3].map((level) => {
      const levelStudents = students.filter((s) => s.level === level)
      const levelResults = results.filter((r) => r.level === level)
      const passed = levelResults.filter((r) => r.status === 'Passed').length
      return {
        level,
        studentCount: levelStudents.length,
        resultCount: levelResults.length,
        passRate: levelResults.length ? (passed / levelResults.length) * 100 : null,
      }
    })
  }, [students, results])

  function handleExport() {
    exportCsv(
      'level_progression.csv',
      ['Level', 'Students', 'Results Recorded', 'Pass Rate %'],
      rows.map((r) => [r.level, r.studentCount, r.resultCount, r.passRate?.toFixed(1) ?? '']),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Student distribution and pass rate by level.</p>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <KpiCard
            key={r.level}
            label={`Level ${r.level} students`}
            value={r.studentCount}
            icon={Layers}
          />
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Level</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Results recorded</TableHead>
            <TableHead>Pass rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.level}>
              <TableCell>{r.level}</TableCell>
              <TableCell>{r.studentCount}</TableCell>
              <TableCell>{r.resultCount}</TableCell>
              <TableCell>{r.passRate != null ? `${r.passRate.toFixed(1)}%` : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
