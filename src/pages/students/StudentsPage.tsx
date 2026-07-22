import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PageHeader } from '@/components/layout/PageHeader'
import type { BreakdownValue, CustomValue } from '@/lib/dashboard/kpiEngine'
import { StudentForm } from '@/components/students/StudentForm'
import { useStudents, type Student } from '@/hooks/useStudents'
import { usePrograms } from '@/hooks/usePrograms'
import { useAuth } from '@/hooks/useAuth'
import type { ModuleKpiWithSource } from '@/hooks/useModuleKpis'
import { useTabFilters } from '@/hooks/useTabFilters'
import { applyRuntimeFilter } from '@/lib/dashboard/runtimeFilter'
import { canWrite } from '@/lib/roles'
import { statusGroup } from '@/lib/student-status'
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

export default function StudentsPage() {
  const { role } = useAuth()
  const { students, loading, createStudent, updateStudent, deleteStudent } = useStudents()
  const { programs } = usePrograms()
  const writable = canWrite(role)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [sortBy, setSortBy] = useState('student_code')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [studentsKpis, setStudentsKpis] = useState<ModuleKpiWithSource[]>([])
  const kpiByColumn = useMemo(
    () => Object.fromEntries(studentsKpis.filter((k) => k.column_name).map((k) => [k.column_name as string, k])),
    [studentsKpis],
  )
  // Students tab queries only the `students` table, so Program + Level are both meaningful
  // tab-wide filters here (per the brief's per-tab list).
  const tabFilters = useTabFilters(studentsKpis, { program: true, level: true })
  function filterFor(columnName: string) {
    const kpi = kpiByColumn[columnName]
    const resolved = kpi ? tabFilters.resolvedByKpi[kpi.id] : tabFilters.tabWide
    return {
      programId: resolved?.programId ?? (kpi?.filter_column === 'program_id' ? kpi.filter_value || null : null),
      level: resolved?.level ?? null,
    }
  }

  const statusOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.enrollment_status))).sort(),
    [students],
  )
  const batchOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.batch).filter((b): b is string => !!b))).sort(),
    [students],
  )

  const filtered = useMemo(() => {
    const rows = students.filter((s) => {
      if (levelFilter !== 'all' && String(s.level) !== levelFilter) return false
      if (statusFilter !== 'all' && s.enrollment_status !== statusFilter) return false
      if (batchFilter !== 'all' && s.batch !== batchFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!s.name.toLowerCase().includes(q) && !s.student_code.toLowerCase().includes(q)) return false
      }
      return true
    })
    return [...rows].sort((a, b) => {
      if (sortBy === 'admission_year') return (b.admission_year ?? 0) - (a.admission_year ?? 0)
      if (sortBy === 'gpa') return (b.gpa ?? 0) - (a.gpa ?? 0)
      return a.student_code.localeCompare(b.student_code)
    })
  }, [students, levelFilter, statusFilter, batchFilter, sortBy, search])

  const kpiCustomValues: Record<string, CustomValue> = useMemo(() => {
    const activePool = applyRuntimeFilter(students, filterFor('students_active'))
    const graduatedPool = applyRuntimeFilter(students, filterFor('students_graduated'))
    const probationPool = applyRuntimeFilter(students, filterFor('students_probation'))
    const active = activePool.filter((s) => statusGroup(s.enrollment_status) === 'active').length
    const graduated = graduatedPool.filter((s) => statusGroup(s.enrollment_status) === 'graduated').length
    const probation = probationPool.filter((s) => statusGroup(s.enrollment_status) === 'probation').length
    return {
      students_active: { value: active },
      students_graduated: { value: graduated },
      students_probation: { value: probation },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  // 4a: "Avg. GPA (graduated)" — top line + Top N graduated students ranked by GPA.
  const gpaGraduatedBreakdown: BreakdownValue = useMemo(() => {
    const topN = Number(kpiByColumn['students_avg_gpa_graduated']?.param_1_value ?? 3)
    const pool = applyRuntimeFilter(students, filterFor('students_avg_gpa_graduated')).filter(
      (s) => statusGroup(s.enrollment_status) === 'graduated' && s.gpa != null,
    )
    const avg = pool.length ? pool.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / pool.length : null
    const ranked = [...pool].sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0)).slice(0, topN)
    return {
      topLabel: 'Avg. GPA (graduated)',
      topValue: { value: avg, format: 'decimal' },
      segments: ranked.map((s, i) => ({ label: `${i + 1}. ${s.name}`, value: (s.gpa ?? 0).toFixed(2) })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  // 4b: "Avg. GPA (all students)" — top line + Top N students overall (any status) by GPA.
  const gpaAllBreakdown: BreakdownValue = useMemo(() => {
    const topN = Number(kpiByColumn['students_avg_gpa_all']?.param_1_value ?? 3)
    const pool = applyRuntimeFilter(students, filterFor('students_avg_gpa_all')).filter((s) => s.gpa != null)
    const avg = pool.length ? pool.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / pool.length : null
    const ranked = [...pool].sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0)).slice(0, topN)
    return {
      topLabel: 'Avg. GPA (all students)',
      topValue: { value: avg, format: 'decimal' },
      segments: ranked.map((s, i) => ({ label: `${i + 1}. ${s.name}`, value: (s.gpa ?? 0).toFixed(2) })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, kpiByColumn, tabFilters.resolvedByKpi, tabFilters.tabWide])

  const kpiCustomBreakdowns: Record<string, BreakdownValue> = useMemo(
    () => ({
      students_avg_gpa_graduated: gpaGraduatedBreakdown,
      students_avg_gpa_all: gpaAllBreakdown,
    }),
    [gpaGraduatedBreakdown, gpaAllBreakdown],
  )

  const kpiDatasets = useMemo(() => ({ students }), [students])

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteStudent(deleting.id)
      toast.success(`Deleted ${deleting.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete student')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Students"
        subtitle="IT Diploma student roster"
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
                Add student
              </Button>
            )}
            <div ref={setToolbarSlot} className="flex items-center gap-2" />
          </>
        }
      />

      <KpiGrid
        targetPage="students"
        datasets={kpiDatasets}
        customValues={kpiCustomValues}
        customBreakdowns={kpiCustomBreakdowns}
        programs={programs}
        canEdit={role === 'admin'}
        tabFilters={tabFilters}
        toolbarPortalTarget={toolbarSlot}
        onKpisChange={setStudentsKpis}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or student code…"
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
          <SelectTrigger className="w-56">
            <SelectValue>{(v: string) => (v === 'all' ? 'All statuses' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={batchFilter} onValueChange={(v) => v && setBatchFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue>{(v: string) => (v === 'all' ? 'All batches' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {batchOptions.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {(v: string) =>
                v === 'admission_year' ? 'Sort: Admission year' : v === 'gpa' ? 'Sort: GPA' : 'Sort: Code'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student_code">Sort: Code</SelectItem>
            <SelectItem value="admission_year">Sort: Admission year</SelectItem>
            <SelectItem value="gpa">Sort: GPA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Admitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>GPA</TableHead>
              {writable && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.student_code}</TableCell>
                <TableCell dir="auto">{s.name}</TableCell>
                <TableCell dir="auto">{s.programs?.name ?? '—'}</TableCell>
                <TableCell>{s.level}</TableCell>
                <TableCell dir="auto">{s.batch ?? '—'}</TableCell>
                <TableCell>{s.admission_year ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={s.enrollment_status} />
                </TableCell>
                <TableCell>{s.gpa ?? '—'}</TableCell>
                {writable && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(s)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(s)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={writable ? 9 : 8} className="text-center text-muted-foreground">
                  No students match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <StudentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editing}
        programs={programs}
        onSubmit={async (input) => {
          if (editing) {
            await updateStudent(editing.id, input)
            toast.success('Student updated')
          } else {
            await createStudent(input)
            toast.success('Student added')
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleting?.name} ({deleting?.student_code}) and all
              associated results. This cannot be undone.
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
