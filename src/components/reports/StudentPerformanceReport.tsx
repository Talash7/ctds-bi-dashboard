import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import type { Student } from '@/hooks/useStudents'
import type { Result } from '@/hooks/useResults'

const MAX_COMPARE = 4
const MIN_COMPARE = 2

function SingleStudentView({ student, results }: { student: Student; results: Result[] }) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()

  const studentResults = useMemo(() => results.filter((r) => r.student_id === student.id), [results, student])
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
  )
}

function CompareStudentsView({ students, results }: { students: Student[]; results: Result[] }) {
  const tc = useChartTextColors()
  const tooltipStyle = useTooltipStyle()
  // Two empty slots to start (the brief's minimum) — a third/fourth can be added on demand,
  // up to MAX_COMPARE.
  const [studentIds, setStudentIds] = useState<string[]>(['', ''])

  const allOptions = useMemo(
    () =>
      students
        .map((s) => ({ value: s.id, label: `${s.student_code} — ${s.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [students],
  )

  const selectedStudents = studentIds.map((id) => students.find((s) => s.id === id)).filter((s): s is Student => !!s)

  const { courseRows, perStudentResults } = useMemo(() => {
    const perStudent = selectedStudents.map((s) => results.filter((r) => r.student_id === s.id))
    const courseInfo = new Map<string, { code: string; name: string }>()
    for (const list of perStudent) {
      for (const r of list) {
        if (!courseInfo.has(r.course_id)) {
          courseInfo.set(r.course_id, { code: r.courses?.code ?? '—', name: r.courses?.name ?? r.course_id.slice(0, 6) })
        }
      }
    }
    const rows = Array.from(courseInfo.entries())
      .map(([courseId, info]) => ({ courseId, ...info }))
      .sort((a, b) => a.code.localeCompare(b.code))
    return { courseRows: rows, perStudentResults: perStudent }
  }, [selectedStudents, results])

  const chartData = useMemo(
    () =>
      courseRows.map((c) => {
        const row: Record<string, string | number> = { name: c.code }
        selectedStudents.forEach((s, i) => {
          const r = perStudentResults[i]?.find((res) => res.course_id === c.courseId)
          row[s.id] = r?.score ?? 0
        })
        return row
      }),
    [courseRows, selectedStudents, perStudentResults],
  )

  const summary = selectedStudents.map((s, i) => {
    const list = perStudentResults[i] ?? []
    const passed = list.filter((r) => r.status === 'Passed').length
    return {
      student: s,
      totalCourses: list.length,
      passRate: list.length ? (passed / list.length) * 100 : null,
    }
  })

  function setSlot(index: number, value: string) {
    setStudentIds((prev) => prev.map((id, i) => (i === index ? value : id)))
  }
  function addSlot() {
    if (studentIds.length < MAX_COMPARE) setStudentIds((prev) => [...prev, ''])
  }
  function removeSlot(index: number) {
    setStudentIds((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Select {MIN_COMPARE}–{MAX_COMPARE} students to compare side by side.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          {studentIds.map((id, i) => {
            const takenElsewhere = new Set(studentIds.filter((_, j) => j !== i).filter(Boolean))
            const options = allOptions.filter((o) => !takenElsewhere.has(o.value))
            return (
              <div key={i} className="flex items-end gap-1">
                <div className="w-56 space-y-1">
                  <p className="text-xs text-muted-foreground">Student {i + 1}</p>
                  <Combobox
                    options={options}
                    value={id}
                    onChange={(v) => setSlot(i, v)}
                    placeholder="Search student…"
                    searchPlaceholder="Type a name or code…"
                    emptyText="No matching students."
                    dir="auto"
                  />
                </div>
                {studentIds.length > MIN_COMPARE && (
                  <Button variant="ghost" size="icon" className="mb-0.5" onClick={() => removeSlot(i)} aria-label="Remove student">
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            )
          })}
          {studentIds.length < MAX_COMPARE && (
            <Button variant="outline" size="sm" onClick={addSlot}>
              <Plus className="size-4" />
              Add student
            </Button>
          )}
        </div>
      </div>

      {selectedStudents.length < MIN_COMPARE ? (
        <p className="text-sm text-muted-foreground">Select at least {MIN_COMPARE} students to see the comparison.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Summary</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Overall GPA</TableHead>
                  <TableHead>Total courses</TableHead>
                  <TableHead>Pass rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.student.id}>
                    <TableCell dir="auto">
                      {row.student.student_code} — {row.student.name}
                    </TableCell>
                    <TableCell>{row.student.level}</TableCell>
                    <TableCell className="font-medium">{row.student.gpa != null ? row.student.gpa.toFixed(2) : '—'}</TableCell>
                    <TableCell>{row.totalCourses}</TableCell>
                    <TableCell>{row.passRate != null ? `${row.passRate.toFixed(1)}%` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Score by course</h3>
            <div className="h-72">
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
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: tc.tick }}
                    formatter={(_value, entry) => {
                      const s = selectedStudents.find((st) => st.id === (entry as { dataKey?: string }).dataKey)
                      return s ? s.name : ''
                    }}
                  />
                  {selectedStudents.map((s, i) => (
                    <Bar key={s.id} dataKey={s.id} name={s.name} fill={tc.categorical[i % tc.categorical.length]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Course-by-course comparison</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    {selectedStudents.map((s) => (
                      <TableHead key={s.id} dir="auto" className="text-center">
                        {s.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseRows.map((c) => (
                    <TableRow key={c.courseId}>
                      <TableCell dir="auto">
                        {c.code} — {c.name}
                      </TableCell>
                      {selectedStudents.map((s, i) => {
                        const r = perStudentResults[i]?.find((res) => res.course_id === c.courseId)
                        return (
                          <TableCell key={s.id} className="text-center">
                            {r ? (
                              <span className="inline-flex items-center gap-1.5">
                                {r.score ?? '—'}
                                <StatusBadge status={r.grade_letter} />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                  {courseRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={selectedStudents.length + 1} className="text-center text-muted-foreground">
                        None of the selected students have any results recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StudentPerformanceReport({ students, results }: { students: Student[]; results: Result[] }) {
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  const [studentId, setStudentId] = useState('')

  const options = useMemo(
    () =>
      students
        .map((s) => ({ value: s.id, label: `${s.student_code} — ${s.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [students],
  )

  const student = students.find((s) => s.id === studentId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {mode === 'single'
            ? 'Search a student by name or code to see their full performance profile.'
            : 'Compare multiple students side by side — useful for advisors looking at students in the same level or batch.'}
        </p>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <Button
            size="sm"
            variant="ghost"
            className={cn(mode === 'single' && 'bg-muted')}
            onClick={() => setMode('single')}
          >
            Single
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(mode === 'compare' && 'bg-muted')}
            onClick={() => setMode('compare')}
          >
            Compare
          </Button>
        </div>
      </div>

      {mode === 'single' ? (
        <>
          <div className="max-w-sm space-y-2">
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
            <SingleStudentView student={student} results={results} />
          )}
        </>
      ) : (
        <CompareStudentsView students={students} results={results} />
      )}
    </div>
  )
}
