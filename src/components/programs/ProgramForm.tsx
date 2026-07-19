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
import type { Program } from '@/hooks/usePrograms'
import type { TablesInsert } from '@/types/database.types'

interface ProgramFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  program?: Program | null
  onSubmit: (input: TablesInsert<'programs'>) => Promise<void>
}

export function ProgramForm({ open, onOpenChange, program, onSubmit }: ProgramFormProps) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [qualification, setQualification] = useState('')
  const [studyDuration, setStudyDuration] = useState('')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(program?.name ?? '')
      setDepartment(program?.department ?? '')
      setQualification(program?.qualification ?? '')
      setStudyDuration(program?.study_duration ?? '')
      setStatus(program?.status ?? 'active')
      setError(null)
    }
  }, [open, program])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Program name is required.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        department: department.trim() || null,
        qualification: qualification.trim() || null,
        study_duration: studyDuration.trim() || null,
        status: status.trim() || 'active',
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
          <DialogTitle>{program ? 'Edit program' : 'Add program'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-department">Department</Label>
              <Input
                id="p-department"
                dir="auto"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-qualification">Qualification</Label>
              <Input
                id="p-qualification"
                dir="auto"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-duration">Study duration</Label>
              <Input
                id="p-duration"
                dir="auto"
                value={studyDuration}
                onChange={(e) => setStudyDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-status">Status</Label>
              <Input id="p-status" dir="auto" value={status} onChange={(e) => setStatus(e.target.value)} />
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
