import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PageHeader } from '@/components/layout/PageHeader'
import type { ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import type { CustomValue } from '@/lib/dashboard/kpiEngine'

// See DashboardPage.tsx's identical helper — kept local per-page since each page's
// KpiGrid instance is its own independent fetch (see onKpisChange below).
function getParam(kpi: ModuleKpiWithSource | undefined, n: 1 | 2, fallback: number): number {
  const value = n === 1 ? kpi?.param_1_value : kpi?.param_2_value
  return value ?? fallback
}
import { ResultForm } from '@/components/results/ResultForm'
import { useResults, type Result } from '@/hooks/useResults'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'
import { usePrograms } from '@/hooks/usePrograms'
import { useAuth } from '@/hooks/useAuth'
import { useTabFilters } from '@/hooks/useTabFilters'
import { applyRuntimeFilter } from '@/lib/dashboard/runtimeFilter'
import { canWrite } from '@/lib/roles'
import { statusGroup } from '@/lib/student-status'
import type { BreakdownValue } from '@/lib/dashboard/kpiEngine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ResultsPage() {
  const { role } = useAuth()
  const { results, loading, createResult, updateResult, deleteResult } = useResults()
  const { students } = useStudents()
  const { courses } = useCourses()
  const { programs } = usePrograms()
  const writable = canWrite(role)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Result | null>(null)
  const [deleting, setDeleting] = useState<Result | null>(null)
  const [resultsKpis, setResultsKpis] = useState<ModuleKpiWithSource[]>([])
  const kpiByColumn = useMemo(
    () => Object.fromEntries(resultsKpis.filter((k) => k.column_name).map((k) => [k.column_name as string, k])),
    [resultsKpis],
  )
  // Results tab queries results/students, both of which carry Program (results via its
  // joined course/student) and Level directly — so both tab-wide fields apply here.
  const tabFilters = useTabFilters(resultsKpis, { program: true, level: true })
  function filterFor(columnName: string) {
    const kpi = kpiByColumn[columnName]
    const resolved = kpi ? tabFilters.resolvedByKpi[kpi.id] : tabFilters.tabWide
    return {
      programId: resolved?.programId ?? (kpi?.filter_column === 'program_id' ? kpi.filter_value || null : null),
      level: resolved?.level ?? null,
    }
  }

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (levelFilter !== 'all' && String(r.level) !== levelFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchesStudent =
          r.students?.name.toLowerCase().includes(q) || r.students?.student_code.toLowerCase().includes(q)
        const matchesCourse =
          r.courses?.name.toLowerCase().includes(q) || r.courses?.code.toLowerCase().includes(q)
        if (!matchesStudent && !matchesCourse) return false
      }
      return true
    })
  }, [results, levelFilter, statusFilter, search])

  const kpiCustomValues: Record<string, CustomValue> = useMemo(() => {
    const resultsForPassRate = applyRuntimeFilter(results, filterFor('results_pass_rate'))
    const passed = resultsForPassRate.filter((r) => r.status === 'Passed').length
    const passRate = resultsForPassRate.length ? (passed / resultsForPassRate.length) * 100 : null

    const atRiskThreshold = getParam(kpiByColumn['results_at_risk'], 1, 2)
    const resultsForAtRisk = applyRuntimeFilter(results, filterFor('results_at_risk'))
    const failsByStudent = new Map<string, number>()
    for (const r of resultsForAtRisk) {
      if (r.status === 'Failed') failsByStudent.set(r.student_id, (failsByStudent.get(r.student_id) ?? 0) + 1)
    }
    const atRisk = Array.from(failsByStudent.values()).filter((n) => n >= atRiskThreshold).length

    return {
      results_pass_rate: {
        value: passRate,
        format: 'percent',
        context: passRate != null ? { type: 'proportion', value: passRate, total: 100 } : undefined,
      },
      results_at_risk: { value: atRisk },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  const kpiDatasets = useMemo(() => ({ results }), [results])

  // "GPA by Level" (results_gpa_by_level) — Program/Level filter (global Filter panel, or the
  // kpi's own persisted default when the global system hasn't touched that field) narrows
  // both the top line and the per-level breakdown.
  const gpaByLevelBreakdown = useMemo((): BreakdownValue => {
    const pool = applyRuntimeFilter(students, filterFor('results_gpa_by_level')).filter((s) => s.gpa != null)
    const avgOf = (list: typeof pool) => (list.length ? list.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / list.length : null)
    const segments = [1, 2, 3].map((level) => {
      const value = avgOf(pool.filter((s) => s.level === level))
      return { label: `Level ${level}`, value: value != null ? value.toFixed(2) : '—' }
    })
    return {
      topLabel: 'Avg. GPA (all students)',
      topValue: { value: avgOf(pool), format: 'decimal' },
      segments,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  // "GPA by Program (Graduated)" (results_gpa_by_program_graduated) — top 3 programs ranked
  // by average GPA among their graduated students; built to scale past the current single
  // program without any code changes once more programs/graduates exist.
  const gpaByProgramGraduatedBreakdown = useMemo((): BreakdownValue => {
    const graduated = applyRuntimeFilter(students, filterFor('results_gpa_by_program_graduated')).filter(
      (s) => statusGroup(s.enrollment_status) === 'graduated' && s.gpa != null,
    )
    const byProgram = new Map<string, number[]>()
    for (const s of graduated) {
      const list = byProgram.get(s.program_id) ?? []
      list.push(s.gpa ?? 0)
      byProgram.set(s.program_id, list)
    }
    const ranked = Array.from(byProgram.entries())
      .map(([programId, gpas]) => ({
        label: programs.find((p) => p.id === programId)?.name ?? 'Unknown program',
        avg: gpas.reduce((sum, g) => sum + g, 0) / gpas.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
    const overallAvg = graduated.length ? graduated.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / graduated.length : null
    return {
      topLabel: 'Avg. GPA (graduated)',
      topValue: { value: overallAvg, format: 'decimal' },
      segments: ranked.map((r) => ({ label: r.label, value: r.avg.toFixed(2) })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, programs, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  const kpiCustomBreakdowns: Record<string, BreakdownValue> = useMemo(
    () => ({
      results_gpa_by_level: gpaByLevelBreakdown,
      results_gpa_by_program_graduated: gpaByProgramGraduatedBreakdown,
    }),
    [gpaByLevelBreakdown, gpaByProgramGraduatedBreakdown],
  )

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteResult(deleting.id)
      toast.success('Result deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete result')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Results"
        subtitle="Course results across all students"
        actions={
          <>
            {writable && (
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="size-4" />
                Add result
              </Button>
            )}
            <div ref={setToolbarSlot} className="flex items-center gap-2" />
          </>
        }
      />

      <KpiGrid
        targetPage="results"
        datasets={kpiDatasets}
        customValues={kpiCustomValues}
        customBreakdowns={kpiCustomBreakdowns}
        programs={programs}
        canEdit={role === 'admin'}
        tabFilters={tabFilters}
        toolbarPortalTarget={toolbarSlot}
        onKpisChange={setResultsKpis}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by student or course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={levelFilter} onValueChange={(v) => v && setLevelFilter(v)}>
          <SelectTrigger className="w-32">
            <SelectValue>
              {(v: string) => (v === 'all' ? 'All levels' : `Level ${v}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="1">Level 1</SelectItem>
            <SelectItem value="2">Level 2</SelectItem>
            <SelectItem value="3">Level 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => (v === 'all' ? 'All statuses' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Passed">Passed</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Absent">Absent</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length.toLocaleString()} of {results.length.toLocaleString()}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto rounded-md border border-border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Exam type</TableHead>
                {writable && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 500).map((r) => (
                <TableRow key={r.id}>
                  <TableCell dir="auto">
                    {r.students?.student_code} — {r.students?.name}
                  </TableCell>
                  <TableCell dir="auto">
                    {r.courses?.code} — {r.courses?.name}
                  </TableCell>
                  <TableCell>{r.level}</TableCell>
                  <TableCell>{r.score ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.grade_letter} />
                  </TableCell>
                  <TableCell>{r.grade_points}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.exam_type}</TableCell>
                  {writable && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(r)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={writable ? 9 : 8} className="text-center text-muted-foreground">
                    No results match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filtered.length > 500 && (
            <p className="p-2 text-center text-xs text-muted-foreground">
              Showing first 500 of {filtered.length.toLocaleString()} matching results — refine your
              filters to narrow this down.
            </p>
          )}
        </div>
      )}

      <ResultForm
        open={formOpen}
        onOpenChange={setFormOpen}
        result={editing}
        students={students}
        courses={courses}
        onSubmit={async (input) => {
          if (editing) {
            await updateResult(editing.id, input)
            toast.success('Result updated')
          } else {
            await createResult(input)
            toast.success('Result added')
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete result?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this result record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
