import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PageHeader } from '@/components/layout/PageHeader'
import { CourseForm } from '@/components/courses/CourseForm'
import { useCourses, type Course } from '@/hooks/useCourses'
import { useCourseStats } from '@/hooks/useCourseStats'
import { usePrograms } from '@/hooks/usePrograms'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/roles'
import { Button } from '@/components/ui/button'
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

export default function CoursesPage() {
  const { role } = useAuth()
  const { courses, loading, createCourse, updateCourse, deleteCourse } = useCourses()
  const { stats, loading: statsLoading } = useCourseStats()
  const { programs } = usePrograms()
  const writable = canWrite(role)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const [levelFilter, setLevelFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState<Course | null>(null)

  const filtered = useMemo(
    () => courses.filter((c) => levelFilter === 'all' || String(c.level) === levelFilter),
    [courses, levelFilter],
  )

  const kpiDatasets = useMemo(() => ({ courses }), [courses])

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteCourse(deleting.id)
      toast.success(`Deleted ${deleting.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete course')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Courses"
        subtitle="Course catalog across all levels"
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
                Add course
              </Button>
            )}
            <div ref={setToolbarSlot} className="flex items-center gap-2" />
          </>
        }
      />

      <KpiGrid
        targetPage="courses"
        datasets={kpiDatasets}
        canEdit={role === 'admin'}
        toolbarPortalTarget={toolbarSlot}
      />

      <div className="flex flex-wrap items-center gap-3">
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Avg. grade points</TableHead>
              <TableHead>Pass rate</TableHead>
              {writable && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const s = stats[c.id]
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm" dir="auto">{c.code}</TableCell>
                  <TableCell dir="auto">{c.name}</TableCell>
                  <TableCell dir="auto">{c.programs?.name ?? '—'}</TableCell>
                  <TableCell>{c.level}</TableCell>
                  <TableCell>
                    {statsLoading ? '…' : (s?.avgGradePoints?.toFixed(2) ?? '—')}
                  </TableCell>
                  <TableCell>
                    {statsLoading ? '…' : s?.passRate != null ? `${s.passRate.toFixed(1)}%` : '—'}
                  </TableCell>
                  {writable && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(c)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={writable ? 7 : 6} className="text-center text-muted-foreground">
                  No courses match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <CourseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editing}
        programs={programs}
        onSubmit={async (input) => {
          if (editing) {
            await updateCourse(editing.id, input)
            toast.success('Course updated')
          } else {
            await createCourse(input)
            toast.success('Course added')
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span dir="auto">{deleting?.name}</span> ({deleting?.code}
              ) and all its results. This cannot be undone.
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
