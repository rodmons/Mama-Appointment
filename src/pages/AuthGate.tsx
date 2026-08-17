import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Layout'

export function SignInPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onLogin(email, password) } catch { setError('That email or password did not work. Please try again.') } finally { setBusy(false) }
  }

  return <main className="auth-page"><section className="auth-card">
    <span className="auth-mark">♥</span><p className="eyebrow">Private family calendar</p><h1>Welcome to Mama Mona</h1><p className="auth-intro">Sign in once on this device to see appointments and contacts.</p>
    <form className="app-form auth-form" onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <Notice tone="error">{error}</Notice>}<button className="button primary full" type="submit" disabled={busy}><Icon name="lock" />{busy ? 'Signing in…' : 'Sign in securely'}</button></form>
    <p className="auth-help">Only approved family accounts can enter.</p>
  </section></main>
}

export function AccessPendingPage({ email, onLogout }: { email: string; onLogout: () => Promise<void> }) {
  return <main className="auth-page"><section className="auth-card"><span className="auth-mark"><Icon name="lock" /></span><p className="eyebrow">Account not approved</p><h1>Access isn’t ready yet</h1><p className="auth-intro">The account <strong>{email}</strong> signed in correctly, but it has not been added to Mama Mona’s approved users.</p><Notice>Ask the administrator to add this account as a viewer or admin in Supabase.</Notice><button className="button secondary full" type="button" onClick={() => void onLogout()}>Sign out</button></section></main>
}

export function AuthLoadingPage() {
  return <main className="auth-page"><section className="auth-card auth-loading" aria-label="Checking secure access"><span className="auth-mark"><Icon name="lock" /></span><h1>Checking secure access…</h1><p>This will only take a moment.</p></section></main>
}
