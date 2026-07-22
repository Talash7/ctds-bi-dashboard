import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
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
import { deriveResultFields } from '@/lib/grades'

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
  const [scoreInput, setScoreInput] = useState('')
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentId(result?.student_id ?? '')
      setCourseId(result?.course_id ?? '')
      setLevel(String(result?.level ?? 1))
      setScoreInput(result?.score != null ? String(result.score) : '')
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

  const trimmedScore = scoreInput.trim()
  const parsedScore = trimmedScore === '' ? null : Number(trimmedScore)
  const scoreValid = trimmedScore === '' || (!Number.isNaN(parsedScore) && parsedScore! >= 0 && parsedScore! <= 100)
  const preview = scoreValid ? deriveResultFields(parsedScore) : null

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
    if (!scoreValid) {
      setError('Score must be a number between 0 and 100, or left blank for an absence.')
      return
    }

    const derived = deriveResultFields(parsedScore)
    setSubmitting(true)
    try {
      await onSubmit({
        student_id: studentId,
        course_id: courseId,
        level: levelNum,
        score: parsedScore,
        grade_letter: derived.grade_letter,
        grade_points: derived.grade_points,
        status: derived.status,
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
              <Label htmlFor="r-score">Score</Label>
              <Input
                id="r-score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Blank = absent"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                aria-invalid={!scoreValid}
              />
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

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Derived:</span>
            {preview ? (
              <>
                <StatusBadge status={preview.grade_letter} />
                <span className="text-muted-foreground">{preview.grade_points.toFixed(2)} pts</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{preview.status}</span>
              </>
            ) : (
              <span className="text-destructive">Enter a score between 0 and 100, or leave blank</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Grade, grade points, and status are always computed from the score — they can't be entered
            independently. Leave the score blank to record an absence.
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
