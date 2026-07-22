import { useEffect, useState, type FormEvent } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Program } from '@/hooks/usePrograms'
import type { Student } from '@/hooks/useStudents'
import type { TablesInsert } from '@/types/database.types'

export const ENROLLMENT_STATUS_OPTIONS = [
  'Active - Passed',
  'Probation - Supplementary(1)',
  'Probation - Supplementary(2)',
  'Probation - Supplementary(3)',
  'Probation - Supplementary(4)',
  'Probation - Supplementary(5)',
  'Probation - Supplementary(6)',
  'Probation - Supplementary(7)',
  'Graduated - Excellent',
  'Graduated - Very Good',
  'Graduated - Good',
]

interface StudentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student | null
  programs: Program[]
  onSubmit: (input: TablesInsert<'students'>) => Promise<void>
}

export function StudentForm({ open, onOpenChange, student, programs, onSubmit }: StudentFormProps) {
  const [studentCode, setStudentCode] = useState('')
  const [name, setName] = useState('')
  const [programId, setProgramId] = useState('')
  const [level, setLevel] = useState('1')
  const [enrollmentStatus, setEnrollmentStatus] = useState(ENROLLMENT_STATUS_OPTIONS[0])
  const [admissionYear, setAdmissionYear] = useState('')
  const [batch, setBatch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentCode(student?.student_code ?? '')
      setName(student?.name ?? '')
      setProgramId(student?.program_id ?? programs[0]?.id ?? '')
      setLevel(String(student?.level ?? 1))
      setEnrollmentStatus(student?.enrollment_status ?? ENROLLMENT_STATUS_OPTIONS[0])
      setAdmissionYear(student?.admission_year != null ? String(student.admission_year) : '')
      setBatch(student?.batch ?? '')
      setError(null)
    }
  }, [open, student, programs])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!studentCode.trim() || !name.trim() || !programId) {
      setError('Student code, name, and program are required.')
      return
    }
    const levelNum = Number(level)
    if (![1, 2, 3].includes(levelNum)) {
      setError('Level must be 1, 2, or 3.')
      return
    }
    let admissionYearValue: number | null = null
    if (admissionYear.trim() !== '') {
      admissionYearValue = Number(admissionYear)
      if (!Number.isInteger(admissionYearValue) || admissionYearValue < 2000 || admissionYearValue > 2100) {
        setError('Admission year must be a valid 4-digit year.')
        return
      }
    }

    setSubmitting(true)
    try {
      await onSubmit({
        student_code: studentCode.trim(),
        name: name.trim(),
        program_id: programId,
        level: levelNum,
        enrollment_status: enrollmentStatus,
        admission_year: admissionYearValue,
        batch: batch.trim() || null,
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
          <DialogTitle>{student ? 'Edit student' : 'Add student'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_code">Student code</Label>
              <Input id="student_code" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={level} onValueChange={(v) => v && setLevel(v)}>
                <SelectTrigger id="level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program">Program</Label>
            <Select value={programId} onValueChange={(v) => v && setProgramId(v)}>
              <SelectTrigger id="program" className="w-full">
                <SelectValue placeholder="Select a program">
                  {(v: string) => (
                    <span dir="auto">{programs.find((p) => p.id === v)?.name ?? ''}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span dir="auto">{p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Enrollment status</Label>
            <Select value={enrollmentStatus} onValueChange={(v) => v && setEnrollmentStatus(v)}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENROLLMENT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admission_year">Admission year</Label>
              <Input
                id="admission_year"
                type="number"
                placeholder="e.g. 2024"
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Input
                id="batch"
                dir="auto"
                placeholder="e.g. A"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </div>
          </div>
          {student && (
            <div className="space-y-2">
              <Label>GPA (cumulative)</Label>
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {student.gpa != null ? student.gpa.toFixed(2) : '—'} — computed automatically from this
                student's results, across all levels.
              </p>
            </div>
          )}
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
