import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useLoginMutation } from '../hooks/useLoginMutation'

function getLoginErrorMessage(
  err:
    | { response?: { data?: unknown; status?: number }; message?: string; code?: string }
    | null
): string {
  if (!err) return 'Invalid username or password.'
  const status = err.response?.status
  const data = err.response?.data
  if (data != null) {
    const msg =
      typeof data === 'string'
        ? data
        : (data as { message?: string; detail?: string; title?: string }).message ??
          (data as { detail?: string }).detail ??
          (data as { title?: string }).title
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    if (typeof data === 'object' && data !== null && !Array.isArray(data))
      return String(
        (data as Record<string, unknown>).message ?? (data as Record<string, unknown>).detail ?? data
      )
  }
  const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK'
  if (isNetworkError) {
    return import.meta.env.DEV
      ? 'Cannot reach the API. Start the backend (port 5104) and the Vite dev server.'
      : 'Cannot reach the API. Check that gym-api and gym-gateway are running on the server.'
  }
  if (status === 401) return 'Invalid username or password.'
  return err.message ?? 'Invalid username or password.'
}

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useLoginMutation()
  const err = loginMutation.error as
    | { response?: { data?: unknown }; message?: string; code?: string }
    | null
  const errorMessage = loginMutation.isError ? getLoginErrorMessage(err) : null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const user = username.trim()
    const pass = password
    if (!user || !pass) return
    loginMutation.mutate({ username: user, password: pass })
  }

  return (
    <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4" autoComplete="on">
      <Input
        label="Username or email"
        type="text"
        name="username"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username or email"
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />

      {errorMessage && (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <Button type="submit" fullWidth size="md" isLoading={loginMutation.isPending}>
        Sign in
      </Button>

      <p className="text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/login" className="font-medium text-blue-300 transition hover:text-blue-200">
          Contact admin
        </Link>
      </p>
    </form>
  )
}
