import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { statusGroup } from '@/lib/student-status'
import { exportCsv } from '@/lib/export-csv'

export function EarlyWarningReport({ students, results }: { students: Student[]; results: Result[] }) {
  const failCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of results) {
      if (r.status === 'Failed') counts.set(r.student_id, (counts.get(r.student_id) ?? 0) + 1)
    }
    return counts
  }, [results])

  const atRisk = useMemo(() => {
    return students
      .map((s) => {
        const fails = failCounts.get(s.id) ?? 0
        const reasons: string[] = []
        if (statusGroup(s.enrollment_status) === 'probation') reasons.push('On probation')
        if (fails >= 2) reasons.push(`Failing ${fails} course(s)`)
        return { student: s, fails, reasons }
      })
      .filter((r) => r.reasons.length > 0)
      .sort((a, b) => b.fails - a.fails)
  }, [students, failCounts])

  function handleExport() {
    exportCsv(
      'academic_early_warning.csv',
      ['Student Code', 'Name', 'Level', 'Enrollment Status', 'Failed Courses', 'Reasons'],
      atRisk.map((r) => [
        r.student.student_code,
        r.student.name,
        r.student.level,
        r.student.enrollment_status,
        r.fails,
        r.reasons.join('; '),
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Students on probation or failing 2 or more courses.
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={atRisk.length === 0}>
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
            <TableHead>Status</TableHead>
            <TableHead>Reasons</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {atRisk.map(({ student, reasons }) => (
            <TableRow key={student.id}>
              <TableCell className="font-mono text-sm">{student.student_code}</TableCell>
              <TableCell dir="auto">{student.name}</TableCell>
              <TableCell>{student.level}</TableCell>
              <TableCell>
                <Badge variant="outline">{student.enrollment_status}</Badge>
              </TableCell>
              <TableCell className="space-x-1">
                {reasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-destructive">
                    {r}
                  </Badge>
                ))}
              </TableCell>
            </TableRow>
          ))}
          {atRisk.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No students currently flagged.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
