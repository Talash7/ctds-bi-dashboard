import { useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Combobox } from '@/components/ui/combobox'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChartTextColors, useTooltipStyle } from '@/components/dashboard/DashboardCharts'
import { CHART_COLORS } from '@/lib/chart-colors'
import type { Student } from '@/hooks/useStudents'
import type { Result } from '@/hooks/useResults'

export function StudentPerformanceReport({ students, results }: { students: Student[]; results: Result[] }) {
  const [studentId, setStudentId] = useState('')
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()

  const options = useMemo(
    () =>
      students
        .map((s) => ({ value: s.id, label: `${s.student_code} — ${s.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [students],
  )

  const student = students.find((s) => s.id === studentId) ?? null

  const studentResults = useMemo(
    () => (student ? results.filter((r) => r.student_id === student.id) : []),
    [results, student],
  )

  const chartData = useMemo(
    () =>
      studentResults.map((r) => ({
        name: r.courses?.code ?? r.course_id.slice(0, 6),
        score: r.score ?? 0,
        status: r.status,
      })),
    [studentResults],
  )

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <p className="text-sm text-muted-foreground">Search a student by name or code to see their full performance profile.</p>
        <Combobox
          options={options}
          value={studentId}
          onChange={setStudentId}
          placeholder="Search student…"
          searchPlaceholder="Type a name or code…"
          emptyText="No matching students."
          dir="auto"
        />
      </div>

      {!student ? (
        <p className="text-sm text-muted-foreground">No student selected yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="truncate font-medium text-foreground" dir="auto" title={student.name}>
                {student.student_code} — {student.name}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Level</p>
              <p className="font-medium text-foreground">{student.level}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Enrollment status</p>
              <StatusBadge status={student.enrollment_status} />
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Overall GPA</p>
              <p className="font-medium text-foreground">{student.gpa != null ? student.gpa.toFixed(2) : '—'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Score by course</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={tc.gridline} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: tc.tick, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: tc.tooltipText }}
                    labelStyle={{ color: tc.tooltipText }}
                    cursor={{ fill: tc.tooltipCursor }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.status === 'Failed' ? CHART_COLORS.danger : CHART_COLORS.gold} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Course results</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell dir="auto">
                      {r.courses?.code} — {r.courses?.name}
                    </TableCell>
                    <TableCell>{r.score ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.grade_letter} />
                    </TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
                {studentResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No results recorded for this student yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
