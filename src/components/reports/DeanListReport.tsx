import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Student } from '@/hooks/useStudents'
import { statusGroup } from '@/lib/student-status'
import { exportCsv } from '@/lib/export-csv'

const DEAN_LIST_SIZE = 10

export function DeanListReport({ students }: { students: Student[] }) {
  const list = useMemo(() => {
    return students
      .filter((s) => s.level === 3 && statusGroup(s.enrollment_status) === 'graduated' && s.gpa != null)
      .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0))
  }, [students])

  function handleExport() {
    exportCsv(
      'deans_list.csv',
      ['Rank', 'Student Code', 'Name', 'Enrollment Status', 'GPA'],
      list.map((s, i) => [i + 1, s.student_code, s.name, s.enrollment_status, s.gpa ?? '']),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Level 3 graduates ranked by GPA. Top {DEAN_LIST_SIZE} are marked Dean's List.
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={list.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>GPA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((s, i) => (
            <TableRow key={s.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="font-mono text-sm">{s.student_code}</TableCell>
              <TableCell dir="auto">{s.name}</TableCell>
              <TableCell>
                <StatusBadge status={s.enrollment_status} />
              </TableCell>
              <TableCell className="font-medium">
                {s.gpa}
                {i < DEAN_LIST_SIZE && (
                  <Badge className="ml-2 bg-gold text-gold-foreground">Dean's List</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No graduated level 3 students with a recorded GPA yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
