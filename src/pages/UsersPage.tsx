import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, ShieldOff } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/contexts/AuthContext'

interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
  roles: AppRole[]
}

const ROLES: AppRole[] = ['admin', 'dean', 'registrar', 'coordinator']

async function callAdminUsers(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...body },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AppRole>('registrar')
  const [submitting, setSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(
    null,
  )

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await callAdminUsers('list')
      setUsers(data.users)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  async function handleSetRole(userId: string, newRole: string) {
    try {
      await callAdminUsers('set_role', { user_id: userId, role: newRole })
      toast.success('Role updated')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  async function handleRemoveRole(userId: string) {
    try {
      await callAdminUsers('remove_role', { user_id: userId })
      toast.success('Role removed')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove role')
    }
  }

  async function handleCreate() {
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    setSubmitting(true)
    try {
      const data = await callAdminUsers('create', {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        role,
      })
      setCreatedCredentials({ email: email.trim(), password: data.temp_password })
      setFormOpen(false)
      setEmail('')
      setFullName('')
      setRole('registrar')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage dashboard accounts and role assignments"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />

      {createdCredentials && (
        <div className="rounded-md border border-gold bg-gold/10 p-4 text-sm">
          <p className="font-medium text-foreground">Account created</p>
          <p className="text-muted-foreground">
            Share these credentials with the user securely — this password is shown only once.
          </p>
          <p className="mt-2 font-mono">
            {createdCredentials.email} / {createdCredentials.password}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreatedCredentials(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last sign in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.email}
                  {u.id === currentUser?.id && (
                    <Badge variant="outline" className="ml-2">
                      You
                    </Badge>
                  )}
                </TableCell>
                <TableCell dir="auto">{u.full_name ?? '—'}</TableCell>
                <TableCell>
                  <Select
                    value={u.roles[0] ?? ''}
                    onValueChange={(v) => v && handleSetRole(u.id, v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="No role">
                        {(v: string) => v || 'No role'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  {u.roles.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRole(u.id)}>
                      <ShieldOff className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name</Label>
              <Input id="new-name" dir="auto" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as AppRole)}>
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
