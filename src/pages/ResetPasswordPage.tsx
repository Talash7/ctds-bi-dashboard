import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { LoginBackground } from '@/components/auth/LoginBackground'

// Landing page for Supabase Auth's password-reset email link — resetPasswordForEmail's
// redirectTo points here. The recovery token in the URL is auto-detected by the supabase-js
// client (detectSessionInUrl defaults to true) before this component even mounts, so all
// that's needed here is collecting the new password and calling updateUser. Styled to match
// Login.tsx's always-dark glass card, since this is the same auth journey the user just came
// from via the "Forgot Password?" link.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    toast.success('Password updated — you can now sign in with your new password.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4 py-12">
      <LoginBackground />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#AE445A] to-[#451952] text-white shadow-lg">
            <GraduationCap className="size-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-white/90">Set a new password</h1>
            <p className="text-sm text-white/50">Choose a new password for your account.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="new-password" className="text-white/80">
              New password
            </Label>
            <InputGroup className="border-white/15 bg-white/5 text-white">
              <InputGroupAddon className="text-white/50">
                <Lock />
              </InputGroupAddon>
              <InputGroupInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                className="text-white placeholder:text-white/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="confirm-password" className="text-white/80">
              Confirm password
            </Label>
            <InputGroup className="border-white/15 bg-white/5 text-white">
              <InputGroupAddon className="text-white/50">
                <Lock />
              </InputGroupAddon>
              <InputGroupInput
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="text-white placeholder:text-white/40"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </InputGroup>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full bg-[#AE445A] text-white hover:bg-[#9c3c50]" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
