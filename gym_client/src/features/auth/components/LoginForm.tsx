import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useLoginMutation } from '../hooks/useLoginMutation'
import { getLoginErrorMessage } from '../utils/loginErrors'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const loginMutation = useLoginMutation()
  const err = loginMutation.error as
    | { response?: { data?: unknown }; message?: string; code?: string }
    | null
  const errorMessage = loginMutation.isError
    ? getLoginErrorMessage(err, 'Invalid username or password.')
    : null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationMessage(null)
    const user = username.trim()
    const pass = password
    if (!user || !pass) {
      setValidationMessage('Enter both username/email and password.')
      return
    }
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

      {(validationMessage || errorMessage) && (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
          role="alert"
        >
          {validationMessage ?? errorMessage}
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
