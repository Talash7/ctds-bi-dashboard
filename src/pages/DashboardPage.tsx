import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'
import { useResults } from '@/hooks/useResults'
import { usePrograms } from '@/hooks/usePrograms'
import { useImportHistory } from '@/hooks/useImportHistory'
import { useAuth } from '@/hooks/useAuth'
import type { ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import type { CustomValue } from '@/lib/dashboard/kpiEngine'
import { statusGroup } from '@/lib/student-status'

// Reads a code-computed KPI's Nth editable parameter (see KpiEditDialog's "Parameters"
// section) with a fallback for KPIs created before this system existed, or where the
// value hasn't been set — keeps this file the single source of truth for what the
// fallback *means*, while letting an admin actually change the number without a code change.
function getParam(kpi: ModuleKpiWithSource | undefined, n: 1 | 2, fallback: number): number {
  const value = n === 1 ? kpi?.param_1_value : kpi?.param_2_value
  return value ?? fallback
}

export default function DashboardPage() {
  const { role } = useAuth()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const { students, loading: studentsLoading } = useStudents()
  const { courses, loading: coursesLoading } = useCourses()
  const { results, loading: resultsLoading } = useResults()
  const { programs, loading: programsLoading } = usePrograms()
  // Fed by KpiGrid's onKpisChange (see KpiGrid.tsx) instead of a second independent
  // useModuleKpis('dashboard') call — a separate fetch had no way to learn about an edit
  // made through KpiGrid's own instance except a realtime round-trip, which left the
  // code-computed KPIs below reading a stale param_1_value/param_2_value until a full
  // page reload. Sharing KpiGrid's own state means an edit is reflected the moment its
  // own refetch() resolves.
  const [dashboardKpis, setDashboardKpis] = useState<ModuleKpiWithSource[]>([])
  const kpiByColumn = useMemo(
    () => Object.fromEntries(dashboardKpis.filter((k) => k.column_name).map((k) => [k.column_name as string, k])),
    [dashboardKpis],
  )
  const importLimit = getParam(kpiByColumn['dash_panel_import_activity'], 1, 5)
  const { rows: recentImports, loading: importsLoading } = useImportHistory(importLimit)

  const loading = studentsLoading || coursesLoading || resultsLoading || programsLoading

  const topLine = useMemo(() => {
    const totalResults = results.length
    const passed = results.filter((r) => r.status === 'Passed').length
    const overallPassRate = totalResults ? (passed / totalResults) * 100 : null

    let gpaSum = 0
    let gpaCount = 0
    for (const s of students) {
      if (statusGroup(s.enrollment_status) === 'graduated' && s.gpa != null) {
        gpaSum += s.gpa
        gpaCount++
      }
    }
    const avgGpaGraduated = gpaCount ? gpaSum / gpaCount : null

    return { overallPassRate, avgGpaGraduated }
  }, [students, results])

  const statusCounts = useMemo(() => {
    let active = 0
    let graduated = 0
    let probation = 0
    let other = 0
    for (const s of students) {
      const g = statusGroup(s.enrollment_status)
      if (g === 'active') active++
      else if (g === 'graduated') graduated++
      else if (g === 'probation') probation++
      else other++
    }
    const atRiskThreshold = getParam(kpiByColumn['dash_at_risk'], 1, 2)
    const failsByStudent = new Map<string, number>()
    for (const r of results) {
      if (r.status === 'Failed') failsByStudent.set(r.student_id, (failsByStudent.get(r.student_id) ?? 0) + 1)
    }
    const atRisk = Array.from(failsByStudent.values()).filter((n) => n >= atRiskThreshold).length
    // Graduation only applies to the configured final-year level — dividing by every
    // student regardless of level (including earlier levels, who can't have graduated yet)
    // artificially deflates the rate. The denominator here is "of those who reached the
    // final year, how many graduated," not "of everyone enrolled, ever."
    const finalYearLevel = getParam(kpiByColumn['dash_graduation_rate'], 1, 3)
    const level3Total = students.filter((s) => s.level === finalYearLevel).length
    const graduationRate = level3Total > 0 ? (graduated / level3Total) * 100 : null

    return { active, graduated, probation, other, atRisk, graduationRate }
  }, [students, results, kpiByColumn])

  const deansList = useMemo(() => {
    // Graduation only ever happens at the program's final year — Dean's List used to let
    // an admin pick any level here, including ones that can never have a graduate (e.g.
    // Level 1/2 in a 3-level program), which just silently produced an empty list. Reusing
    // Graduation rate's "Final year level" param as the single source of truth means the
    // two stay in sync and this can't be pointed at a level with no possible data.
    const level = getParam(kpiByColumn['dash_graduation_rate'], 1, 3)
    const topN = getParam(kpiByColumn['dash_panel_deans_list'], 1, 5)
    const programId = kpiByColumn['dash_panel_deans_list']?.filter_value || null
    return students
      .filter(
        (s) =>
          s.level === level &&
          statusGroup(s.enrollment_status) === 'graduated' &&
          s.gpa != null &&
          (!programId || s.program_id === programId),
      )
      .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0))
      .slice(0, topN)
  }, [students, kpiByColumn])

  const courseDifficulty = useMemo(() => {
    const cutoff = getParam(kpiByColumn['dash_course_difficulty'], 1, 70)
    const acc: Record<string, { passed: number; total: number }> = {}
    for (const r of results) {
      acc[r.course_id] ??= { passed: 0, total: 0 }
      acc[r.course_id].total++
      if (r.status === 'Passed') acc[r.course_id].passed++
    }
    let flagged = 0
    for (const c of Object.values(acc)) {
      if (c.total > 0 && (c.passed / c.total) * 100 < cutoff) flagged++
    }
    return flagged
  }, [results, kpiByColumn])

  const dataFreshness = useMemo(() => {
    const successful = recentImports.filter((r) => r.status === 'success' || r.status === 'partial')
    return successful[0]?.created_at ?? null
  }, [recentImports])

  const programStatusCounts = useMemo(() => {
    const active = programs.filter((p) => p.status?.toLowerCase() === 'active' || p.status === 'نشط').length
    return { active, inactive: programs.length - active }
  }, [programs])

  const gradeBoundaryRisk = useMemo(() => {
    const lower = getParam(kpiByColumn['dash_grade_boundary_risk'], 1, 38)
    const upper = getParam(kpiByColumn['dash_grade_boundary_risk'], 2, 41)
    return results.filter((r) => r.score != null && r.score >= lower && r.score <= upper).length
  }, [results, kpiByColumn])

  // Values for `aggregation: 'custom'` module_kpis rows — multi-row/derived logic that
  // can't be expressed as a plain count/sum/avg, keyed by the row's `column_name` code.
  const customValues: Record<string, CustomValue> = useMemo(
    () => ({
      dash_overall_pass_rate: {
        value: topLine.overallPassRate,
        format: 'percent',
        context: topLine.overallPassRate != null ? { type: 'proportion', value: topLine.overallPassRate, total: 100 } : undefined,
      },
      dash_avg_gpa_graduated: { value: topLine.avgGpaGraduated, format: 'decimal' },
      dash_active: {
        value: statusCounts.active,
        context: { type: 'proportion', value: statusCounts.active, total: students.length },
      },
      dash_graduated: {
        value: statusCounts.graduated,
        context: { type: 'proportion', value: statusCounts.graduated, total: students.length },
      },
      dash_probation: {
        value: statusCounts.probation,
        context: { type: 'proportion', value: statusCounts.probation, total: students.length },
      },
      dash_at_risk: {
        value: statusCounts.atRisk,
        context: { type: 'proportion', value: statusCounts.atRisk, total: students.length },
      },
      dash_course_difficulty: { value: courseDifficulty },
      dash_data_freshness: { value: dataFreshness ? new Date(dataFreshness).toLocaleDateString() : 'None yet' },
      dash_active_programs: { value: `${programStatusCounts.active} / ${programs.length}` },
      dash_graduation_rate: {
        value: statusCounts.graduationRate,
        format: 'percent',
        context: statusCounts.graduationRate != null ? { type: 'proportion', value: statusCounts.graduationRate, total: 100 } : undefined,
      },
      dash_grade_boundary_risk: {
        value: gradeBoundaryRisk,
        context: { type: 'proportion', value: gradeBoundaryRisk, total: results.length },
      },
    }),
    [topLine, statusCounts, courseDifficulty, dataFreshness, programStatusCounts, programs.length, gradeBoundaryRisk, students.length, results.length],
  )

  // Every chart-type module_kpis row on this page is now a plain generic aggregation
  // (group_by_column, optionally bucket_width for a numeric histogram) — none of them need
  // a customCharts entry anymore. "Enrollment Status Breakdown" groups by the raw
  // enrollment_status column directly instead of the active/graduated/probation/other
  // buckets it used to use, and "Score Distribution" bins `score` via bucket_width.

  // Content for `display_type: 'panel'` module_kpis rows — bespoke, non-aggregation
  // dashboard sections (tables, extra charts) rendered as arbitrary React nodes so they
  // sit in the same drag/resize grid as every other panel, keyed the same way as
  // customValues/customCharts.
  const customPanels: Record<string, ReactNode> = useMemo(
    () => ({
      dash_panel_deans_list: (
        <Card className="h-full">
          <CardContent className="flex h-full flex-col space-y-3 overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                Dean's List (Top {getParam(kpiByColumn['dash_panel_deans_list'], 1, 5)})
              </h3>
              <Link to="/reports" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>GPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deansList.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell dir="auto">
                      {s.student_code} — {s.name}
                    </TableCell>
                    <TableCell className="font-medium">{s.gpa?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {deansList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No level {getParam(kpiByColumn['dash_graduation_rate'], 1, 3)} graduates with a GPA yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ),
      dash_panel_import_activity: (
        <Card className="h-full">
          <CardContent className="flex h-full flex-col space-y-3 overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Recent Data Import Activity</h3>
              <Link to="/import" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.entity}</TableCell>
                    <TableCell>{r.row_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {!importsLoading && recentImports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No imports recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ),
    }),
    [deansList, recentImports, importsLoading, kpiByColumn],
  )

  const datasets = useMemo(() => ({ students, programs, courses, results }), [students, programs, courses, results])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        subtitle="College-wide overview across all programs"
        actions={<div ref={setToolbarSlot} className="flex items-center gap-2" />}
      />

      <KpiGrid
        targetPage="dashboard"
        datasets={datasets}
        customValues={customValues}
        customPanels={customPanels}
        programs={programs}
        canEdit={role === 'admin'}
        toolbarPortalTarget={toolbarSlot}
        onKpisChange={setDashboardKpis}
      />
    </div>
  )
}
