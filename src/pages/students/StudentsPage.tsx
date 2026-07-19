import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Users, UserCheck, GraduationCap, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { StudentForm } from '@/components/students/StudentForm'
import { useStudents, type Student } from '@/hooks/useStudents'
import { usePrograms } from '@/hooks/usePrograms'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/roles'
import { statusGroup } from '@/lib/student-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)

  const statusOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.enrollment_status))).sort(),
    [students],
  )

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (levelFilter !== 'all' && String(s.level) !== levelFilter) return false
      if (statusFilter !== 'all' && s.enrollment_status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!s.name.toLowerCase().includes(q) && !s.student_code.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [students, levelFilter, statusFilter, search])

  const kpis = useMemo(() => {
    const total = students.length
    let active = 0
    let graduated = 0
    let probation = 0
    let gpaSum = 0
    let gpaCount = 0
    for (const s of students) {
      const group = statusGroup(s.enrollment_status)
      if (group === 'active') active++
      else if (group === 'graduated') {
        graduated++
        if (s.gpa != null) {
          gpaSum += s.gpa
          gpaCount++
        }
      } else if (group === 'probation') probation++
    }
    return {
      total,
      active,
      graduated,
      probation,
      avgGpa: gpaCount ? (gpaSum / gpaCount).toFixed(2) : '—',
    }
  }, [students])

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Students</h1>
          <p className="text-muted-foreground">IT Diploma student roster</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total students" value={kpis.total} icon={Users} />
        <KpiCard label="Active" value={kpis.active} icon={UserCheck} />
        <KpiCard label="Graduated" value={kpis.graduated} icon={GraduationCap} accent />
        <KpiCard label="On probation" value={kpis.probation} icon={AlertTriangle} />
        <KpiCard label="Avg. GPA (graduated)" value={kpis.avgGpa} />
      </div>

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
                <TableCell>
                  <Badge variant="outline">{s.enrollment_status}</Badge>
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
                <TableCell colSpan={writable ? 7 : 6} className="text-center text-muted-foreground">
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
