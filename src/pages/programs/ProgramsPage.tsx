import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GraduationCap, Users, TrendingUp, Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ProgramForm } from '@/components/programs/ProgramForm'
import { usePrograms, type Program } from '@/hooks/usePrograms'
import { useProgramStats } from '@/hooks/useProgramStats'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function ProgramsPage() {
  const { role } = useAuth()
  const { programs, loading, createProgram, updateProgram, deleteProgram } = usePrograms()
  const { stats, loading: statsLoading } = useProgramStats()
  const writable = canWrite(role)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [deleting, setDeleting] = useState<Program | null>(null)

  const kpis = useMemo(() => {
    const totalStudents = Object.values(stats).reduce((sum, s) => sum + s.studentCount, 0)
    const rates = Object.values(stats)
      .map((s) => s.passRate)
      .filter((r): r is number => r != null)
    const overallPassRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    return {
      total: programs.length,
      totalStudents,
      overallPassRate: overallPassRate != null ? `${overallPassRate.toFixed(1)}%` : '—',
    }
  }, [programs, stats])

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteProgram(deleting.id)
      toast.success(`Deleted ${deleting.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete program')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Programs</h1>
          <p className="text-muted-foreground">Academic programs offered by the college</p>
        </div>
        {writable && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add program
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Programs" value={kpis.total} icon={GraduationCap} accent />
        <KpiCard label="Total students" value={kpis.totalStudents} icon={Users} />
        <KpiCard label="Overall pass rate" value={kpis.overallPassRate} icon={TrendingUp} />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Pass rate</TableHead>
              {writable && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => {
              const s = stats[p.id]
              return (
                <TableRow key={p.id}>
                  <TableCell dir="auto">{p.name}</TableCell>
                  <TableCell dir="auto">{p.department ?? '—'}</TableCell>
                  <TableCell dir="auto">{p.qualification ?? '—'}</TableCell>
                  <TableCell dir="auto">{p.study_duration ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                  <TableCell>{statsLoading ? '…' : (s?.studentCount ?? 0)}</TableCell>
                  <TableCell>
                    {statsLoading ? '…' : s?.passRate != null ? `${s.passRate.toFixed(1)}%` : '—'}
                  </TableCell>
                  {writable && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {programs.length === 0 && (
              <TableRow>
                <TableCell colSpan={writable ? 8 : 7} className="text-center text-muted-foreground">
                  No programs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <ProgramForm
        open={formOpen}
        onOpenChange={setFormOpen}
        program={editing}
        onSubmit={async (input) => {
          if (editing) {
            await updateProgram(editing.id, input)
            toast.success('Program updated')
          } else {
            await createProgram(input)
            toast.success('Program added')
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span dir="auto">{deleting?.name}</span> along with all
              of its courses, students, and results. This cannot be undone.
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
