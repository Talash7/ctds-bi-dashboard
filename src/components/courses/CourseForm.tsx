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
import type { Course } from '@/hooks/useCourses'
import type { TablesInsert } from '@/types/database.types'

interface CourseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
  programs: Program[]
  onSubmit: (input: TablesInsert<'courses'>) => Promise<void>
}

export function CourseForm({ open, onOpenChange, course, programs, onSubmit }: CourseFormProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [programId, setProgramId] = useState('')
  const [level, setLevel] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(course?.code ?? '')
      setName(course?.name ?? '')
      setProgramId(course?.program_id ?? programs[0]?.id ?? '')
      setLevel(String(course?.level ?? 1))
      setError(null)
    }
  }, [open, course, programs])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!code.trim() || !name.trim() || !programId) {
      setError('Code, name, and program are required.')
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
        code: code.trim(),
        name: name.trim(),
        program_id: programId,
        level: levelNum,
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
          <DialogTitle>{course ? 'Edit course' : 'Add course'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-code">Course code</Label>
              <Input id="c-code" dir="auto" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-level">Level</Label>
              <Select value={level} onValueChange={(v) => v && setLevel(v)}>
                <SelectTrigger id="c-level" className="w-full">
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
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-program">Program</Label>
            <Select value={programId} onValueChange={(v) => v && setProgramId(v)}>
              <SelectTrigger id="c-program" className="w-full">
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
