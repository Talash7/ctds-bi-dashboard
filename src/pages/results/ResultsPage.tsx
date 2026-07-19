import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, TrendingUp, AlertOctagon, Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ResultForm } from '@/components/results/ResultForm'
import { useResults, type Result } from '@/hooks/useResults'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/roles'
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

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F', 'Abs']

export default function ResultsPage() {
  const { role } = useAuth()
  const { results, loading, createResult, updateResult, deleteResult } = useResults()
  const { students } = useStudents()
  const { courses } = useCourses()
  const writable = canWrite(role)

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Result | null>(null)
  const [deleting, setDeleting] = useState<Result | null>(null)

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

  const kpis = useMemo(() => {
    const gradeCounts: Record<string, number> = {}
    let passed = 0
    const failsByStudent = new Map<string, number>()

    for (const r of results) {
      gradeCounts[r.grade_letter] = (gradeCounts[r.grade_letter] ?? 0) + 1
      if (r.status === 'Passed') passed++
      if (r.status === 'Failed') {
        failsByStudent.set(r.student_id, (failsByStudent.get(r.student_id) ?? 0) + 1)
      }
    }
    const atRisk = Array.from(failsByStudent.values()).filter((n) => n >= 2).length
    const passRate = results.length ? (passed / results.length) * 100 : null

    return { gradeCounts, passRate, atRisk }
  }, [results])

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Results</h1>
          <p className="text-muted-foreground">Course results across all students</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GRADE_ORDER.map((g) => (
          <KpiCard key={g} label={`Grade ${g}`} value={kpis.gradeCounts[g] ?? 0} />
        ))}
        <KpiCard
          label="Pass rate"
          value={kpis.passRate != null ? `${kpis.passRate.toFixed(1)}%` : '—'}
          icon={TrendingUp}
          accent
        />
        <KpiCard label="At-risk students (2+ fails)" value={kpis.atRisk} icon={AlertOctagon} />
        <KpiCard label="Total results" value={results.length} icon={ClipboardList} />
      </div>

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
                  <TableCell>
                    <Badge variant="outline">{r.grade_letter}</Badge>
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
                  <TableCell colSpan={writable ? 8 : 7} className="text-center text-muted-foreground">
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
