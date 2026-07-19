import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Program } from '@/hooks/usePrograms'
import type { Student } from '@/hooks/useStudents'
import type { ProgramStats } from '@/hooks/useProgramStats'
import { exportCsv } from '@/lib/export-csv'

export function ProgramSummaryReport({
  programs,
  students,
  stats,
}: {
  programs: Program[]
  students: Student[]
  stats: Record<string, ProgramStats>
}) {
  const rows = useMemo(() => {
    return programs.map((p) => {
      const programStudents = students.filter((s) => s.program_id === p.id)
      const perLevel = [1, 2, 3].map((level) => programStudents.filter((s) => s.level === level).length)
      const s = stats[p.id]
      return { program: p, perLevel, studentCount: s?.studentCount ?? 0, passRate: s?.passRate ?? null }
    })
  }, [programs, students, stats])

  function handleExport() {
    exportCsv(
      'program_summary.csv',
      ['Name', 'Students', 'Level 1', 'Level 2', 'Level 3', 'Pass Rate %'],
      rows.map((r) => [
        r.program.name,
        r.studentCount,
        r.perLevel[0],
        r.perLevel[1],
        r.perLevel[2],
        r.passRate?.toFixed(1) ?? '',
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Cross-program summary. Currently one program is offered.
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Program</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Level 1</TableHead>
            <TableHead>Level 2</TableHead>
            <TableHead>Level 3</TableHead>
            <TableHead>Pass rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.program.id}>
              <TableCell dir="auto">{r.program.name}</TableCell>
              <TableCell>{r.studentCount}</TableCell>
              <TableCell>{r.perLevel[0]}</TableCell>
              <TableCell>{r.perLevel[1]}</TableCell>
              <TableCell>{r.perLevel[2]}</TableCell>
              <TableCell>{r.passRate != null ? `${r.passRate.toFixed(1)}%` : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
