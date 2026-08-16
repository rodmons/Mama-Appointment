import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Notice, PageIntro } from '../components/Layout'

interface Props {
  configured: boolean
  adminMode: boolean
  userEmail: string
  onDemoToggle: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onLogout: () => Promise<void>
  onResetDemo: () => void
}

export function SettingsPage({ configured, adminMode, userEmail, onDemoToggle, onLogin, onLogout, onResetDemo }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await onLogin(email, password) } catch { setError('We couldn’t sign you in. Check the email and password, then try again.') } finally { setBusy(false) }
  }

  return <div>
    <PageIntro eyebrow="Private controls" title="Settings" text="Mom Mode stays simple and read-only. Admin tools are kept here." />
    <section className="settings-card">
      <div className="settings-icon"><Icon name="user" /></div><div className="settings-copy"><h2>Admin access</h2><p>Add, edit, cancel, and remove appointments only after Admin Mode is enabled.</p></div>
      {!configured ? <>
        <Notice><strong>Development only:</strong> Supabase is not connected, so this local toggle is available for testing.</Notice>
        <div className="setting-row"><div><strong>Local Admin Mode</strong><span>{adminMode ? 'Editing controls are visible' : 'Mom Mode is read-only'}</span></div><button className={`switch ${adminMode ? 'on' : ''}`} type="button" role="switch" aria-checked={adminMode} onClick={onDemoToggle}><span /></button></div>
      </> : adminMode ? <div className="signed-in"><Notice tone="success">Signed in as <strong>{userEmail}</strong></Notice><button className="button secondary full" type="button" onClick={onLogout}>Sign out of Admin Mode</button></div> : <form className="app-form login-form" onSubmit={login}><label>Admin email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <Notice tone="error">{error}</Notice>}<button className="button primary full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Enter Admin Mode'}</button></form>}
    </section>
    {!configured && <section className="settings-card"><div className="settings-copy"><h2>Demo data</h2><p>Appointments and changes are saved only in this browser. Reset restores the original examples.</p></div><button className="button secondary full" type="button" onClick={onResetDemo}>Reset demo data</button></section>}
    <section className="privacy-note"><Icon name="check" /><div><h2>Privacy reminder</h2><p>Use this app for appointment logistics only. Do not store health numbers, passwords, or detailed medical records.</p></div></section>
    <p className="version-note">Mama Mona Appointments · Version 1.0</p>
  </div>
}
