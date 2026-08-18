import type { AppRole } from '../types'
import { Icon } from '../components/Icon'
import { PageIntro } from '../components/Layout'

export function SettingsPage({ configured, role, userEmail, onLogout, onResetDemo }: { configured: boolean; role: AppRole | null; userEmail: string; onLogout: () => Promise<void>; onResetDemo: () => void }) {
  const canAdmin = role === 'admin' || !configured
  return <div>
    <PageIntro eyebrow="Private account" title="Account" text="Your access and safety controls." />
    <section className="settings-card">
      <div className="settings-icon"><Icon name={canAdmin ? 'lock' : 'user'} /></div><div className="settings-copy"><h2>{configured ? role === 'admin' ? 'Administrator' : 'Mom Mode viewer' : 'Demo access'}</h2><p>{configured ? userEmail : 'Supabase is not connected yet. Changes stay in this browser.'}</p></div>
      {canAdmin && <p className="account-mode-help">Use the Admin Mode switch in the header whenever you need to add or edit information.</p>}
      {configured && <button className="button secondary full account-signout" type="button" onClick={() => void onLogout()}>Sign out on this device</button>}
    </section>
    {!configured && <section className="settings-card"><div className="settings-copy"><h2>Demo data</h2><p>Appointments and changes are saved only in this browser. Reset restores the original examples.</p></div><button className="button secondary full" type="button" onClick={onResetDemo}>Reset demo data</button></section>}
    <section className="privacy-note"><Icon name="check" /><div><h2>Private by design</h2><p>Only approved Supabase accounts can read this calendar. Continue keeping detailed medical records and identification numbers out of the app.</p></div></section>
    <p className="version-note">Mama Mona Appointments · Version 1.1</p>
  </div>
}
