import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { LoginBackground } from '@/components/auth/LoginBackground'

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await resetPassword(email)
    setSubmitting(false)
    if (error) setError(error)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-white/80">
          Check your email for a reset link — it'll take you back here to set a new password.
        </p>
        <Button type="button" variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 text-left">
        <Label htmlFor="reset-email" className="text-white/80">
          Email
        </Label>
        <InputGroup className="border-white/15 bg-white/5 text-white">
          <InputGroupAddon className="text-white/50">
            <Mail />
          </InputGroupAddon>
          <InputGroupInput
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            placeholder="example@mail.com"
            className="text-white placeholder:text-white/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </InputGroup>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full bg-[#AE445A] text-white hover:bg-[#9c3c50]" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </Button>
      <button type="button" onClick={onBack} className="w-full text-center text-sm text-white/70 hover:text-white hover:underline">
        Back to sign in
      </button>
    </form>
  )
}

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'login' | 'forgot'>('login')

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4 py-12">
      {/* Always dark — this background IS the theme, independent of the app's own light/dark
          mode setting (see App.tsx's ThemeProvider), so it's styled with literal colors below
          rather than the semantic bg-background/text-foreground tokens used everywhere else. */}
      <LoginBackground />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#AE445A] to-[#451952] text-white shadow-lg">
            <GraduationCap className="size-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-white/90">
              {view === 'forgot' ? 'Reset your password' : 'CTDS BI Dashboard'}
            </h1>
            <p className="text-sm text-white/50">
              {view === 'forgot' ? 'Enter your email and we’ll send you a reset link.' : 'Sign in to continue'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {view === 'forgot' ? (
            <ForgotPasswordForm onBack={() => setView('login')} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="email" className="text-white/80">
                  Email
                </Label>
                <InputGroup className="border-white/15 bg-white/5 text-white">
                  <InputGroupAddon className="text-white/50">
                    <Mail />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="example@mail.com"
                    className="text-white placeholder:text-white/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </InputGroup>
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password" className="text-white/80">
                  Password
                </Label>
                <InputGroup className="border-white/15 bg-white/5 text-white">
                  <InputGroupAddon className="text-white/50">
                    <Lock />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Password"
                    className="text-white placeholder:text-white/40"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="text-white/50 hover:text-white"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-white/30 bg-white/10 accent-[#AE445A]"
                  />
                  Remember me
                </label>
                <button type="button" onClick={() => setView('forgot')} className="text-[#F39F5A] hover:underline">
                  Forgot Password?
                </button>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full bg-[#AE445A] text-white hover:bg-[#9c3c50]" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Login'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
