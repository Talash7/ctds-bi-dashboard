import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Student } from '@/hooks/useStudents'
import type { Course } from '@/hooks/useCourses'
import type { Result } from '@/hooks/useResults'
import type { TablesInsert } from '@/types/database.types'
import { GRADE_LETTERS, gradePointsFor, statusFor } from '@/lib/grades'

const EXAM_TYPES = ['Final', 'Supplementary/Alternative']

interface ResultFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result?: Result | null
  students: Student[]
  courses: Course[]
  onSubmit: (input: TablesInsert<'results'>) => Promise<void>
}

export function ResultForm({ open, onOpenChange, result, students, courses, onSubmit }: ResultFormProps) {
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [level, setLevel] = useState('1')
  const [gradeLetter, setGradeLetter] = useState<string>('A')
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentId(result?.student_id ?? '')
      setCourseId(result?.course_id ?? '')
      setLevel(String(result?.level ?? 1))
      setGradeLetter(result?.grade_letter ?? 'A')
      setExamType(result?.exam_type ?? EXAM_TYPES[0])
      setError(null)
    }
  }, [open, result])

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.student_code} — ${s.name}` })),
    [students],
  )
  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [courses],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!studentId || !courseId) {
      setError('Student and course are required.')
      return
    }
    const levelNum = Number(level)
    if (![1, 2, 3].includes(levelNum)) {
      setError('Level must be 1, 2, or 3.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        student_id: studentId,
        course_id: courseId,
        level: levelNum,
        grade_letter: gradeLetter,
        grade_points: gradePointsFor(gradeLetter),
        status: statusFor(gradeLetter),
        exam_type: examType,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{result ? 'Edit result' : 'Add result'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Combobox
              options={studentOptions}
              value={studentId}
              onChange={setStudentId}
              placeholder="Select a student"
              searchPlaceholder="Search students…"
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            <Label>Course</Label>
            <Combobox
              options={courseOptions}
              value={courseId}
              onChange={setCourseId}
              placeholder="Select a course"
              searchPlaceholder="Search courses…"
              dir="auto"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="r-level">Level</Label>
              <Select value={level} onValueChange={(v) => v && setLevel(v)}>
                <SelectTrigger id="r-level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-grade">Grade</Label>
              <Select value={gradeLetter} onValueChange={(v) => v && setGradeLetter(v)}>
                <SelectTrigger id="r-grade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LETTERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-exam">Exam type</Label>
              <Select value={examType} onValueChange={(v) => v && setExamType(v)}>
                <SelectTrigger id="r-exam" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Grade points ({gradePointsFor(gradeLetter).toFixed(1)}) and status (
            {statusFor(gradeLetter)}) are derived automatically from the grade.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
