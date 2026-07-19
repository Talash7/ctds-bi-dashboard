import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { AppRole } from '@/contexts/AuthContext'

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles?: AppRole[]
}) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!role) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-lg font-semibold text-foreground">No role assigned</h1>
          <p className="text-sm text-muted-foreground">
            Your account is signed in but has no role yet. Ask an administrator to assign one
            from the Users &amp; Roles page.
          </p>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return <>{children}</>
}
