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
  const [gpa, setGpa] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentCode(student?.student_code ?? '')
      setName(student?.name ?? '')
      setProgramId(student?.program_id ?? programs[0]?.id ?? '')
      setLevel(String(student?.level ?? 1))
      setEnrollmentStatus(student?.enrollment_status ?? ENROLLMENT_STATUS_OPTIONS[0])
      setGpa(student?.gpa != null ? String(student.gpa) : '')
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
    let gpaValue: number | null = null
    if (gpa.trim() !== '') {
      gpaValue = Number(gpa)
      if (Number.isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4) {
        setError('GPA must be a number between 0 and 4.')
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
        gpa: gpaValue,
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
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA (graduated only)</Label>
              <Input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
              />
            </div>
          </div>
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
