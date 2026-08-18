import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppHeader, BottomNavigation, FloatingAddButton, Notice } from './components/Layout'
import { AppointmentDetail } from './components/AppointmentDetail'
import { CalendarView } from './components/CalendarView'
import { AppointmentForm, ConfirmDialog, ContactForm, Modal } from './components/Forms'
import { HomePage } from './pages/HomePage'
import { ContactsPage } from './pages/ContactsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AccessPendingPage, AuthLoadingPage, SignInPage } from './pages/AuthGate'
import { dataService } from './services/dataService'
import { isSupabaseConfigured, supabase } from './services/supabase'
import type { AppRole, Appointment, AppointmentDraft, AppView, Contact, ContactDraft } from './types'
import { toDateInputValue } from './utils/date'

type ModalState =
  | { type: 'appointment'; appointment?: Appointment }
  | { type: 'contact'; contact?: Contact }
  | { type: 'cancel'; appointment: Appointment }
  | { type: 'delete'; appointment: Appointment }
  | null

function App() {
  const [view, setView] = useState<AppView>('home')
  const [detailBackView, setDetailBackView] = useState<AppView>('home')
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()))
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [demoAdmin, setDemoAdmin] = useState(false)
  const [adminEnabled, setAdminEnabled] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [accessRole, setAccessRole] = useState<AppRole | null | undefined>(isSupabaseConfigured ? undefined : null)
  const [online, setOnline] = useState(navigator.onLine)

  const canAdmin = isSupabaseConfigured ? accessRole === 'admin' : true
  const adminMode = isSupabaseConfigured ? canAdmin && adminEnabled : demoAdmin
  const selectedAppointment = appointments.find((item) => item.id === selectedAppointmentId)

  const loadData = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const data = await dataService.load()
      setAppointments(data.appointments); setContacts(data.contacts)
    } catch {
      setLoadError('Appointments could not be loaded right now. Please check your connection and try again.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setAuthReady(true) }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession); setAuthReady(true)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) { void loadData(); return }
    if (!authReady) return
    if (!session) {
      setAccessRole(null); setAppointments([]); setContacts([]); setLoading(false); setAdminEnabled(false)
      return
    }
    let active = true
    setAccessRole(undefined)
    void dataService.getAccessRole(session.user.id).then((role) => {
      if (!active) return
      setAccessRole(role)
      setAdminEnabled(false)
      if (role) void loadData()
      else setLoading(false)
    }).catch(() => {
      if (active) { setAccessRole(null); setLoading(false) }
    })
    return () => { active = false }
  }, [authReady, loadData, session])

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler); window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])

  useEffect(() => { if (!adminMode && modal) setModal(null) }, [adminMode, modal])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 3500); return () => window.clearTimeout(timer) }, [message])

  function navigate(nextView: AppView) {
    setView(nextView)
    if (nextView !== 'details') setSelectedAppointmentId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openAppointment(appointment: Appointment) {
    setDetailBackView(view === 'calendar' ? 'calendar' : 'home'); setSelectedAppointmentId(appointment.id); setView('details'); window.scrollTo({ top: 0 })
  }

  async function saveAppointment(draft: AppointmentDraft, appointment?: Appointment) {
    setBusy(true)
    try {
      const saved = await dataService.saveAppointment(draft, appointment?.id)
      setAppointments((items) => appointment ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
      setSelectedAppointmentId(saved.id); setModal(null); setMessage(appointment ? 'Appointment updated.' : 'Appointment added.')
      if (appointment) setView('details')
    } catch { setMessage('The appointment could not be saved. Please try again.') } finally { setBusy(false) }
  }

  async function saveContact(draft: ContactDraft, contact?: Contact): Promise<Contact> {
    setBusy(true)
    try {
      const saved = await dataService.saveContact(draft, contact?.id)
      setContacts((items) => contact ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
      if (modal?.type === 'contact') setModal(null)
      setMessage(contact ? 'Contact updated.' : 'Contact added.')
      return saved
    } catch { setMessage('The contact could not be saved. Please try again.'); throw new Error('save failed') } finally { setBusy(false) }
  }

  async function cancelAppointment(appointment: Appointment) { await saveAppointment({ ...appointment, status: 'cancelled' }, appointment); setModal(null); setMessage('Appointment cancelled.') }
  async function deleteAppointment(appointment: Appointment) {
    setBusy(true)
    try { await dataService.deleteAppointment(appointment.id); setAppointments((items) => items.filter((item) => item.id !== appointment.id)); setModal(null); setSelectedAppointmentId(''); setView('home'); setMessage('Appointment deleted.') }
    catch { setMessage('The appointment could not be deleted. Please try again.') } finally { setBusy(false) }
  }

  async function login(email: string, password: string) {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() { if (supabase) await supabase.auth.signOut() }
  function resetDemo() { dataService.resetDemo(); setDemoAdmin(false); setMessage('Demo data restored.'); void loadData(); navigate('home') }

  const page = useMemo(() => {
    if (loading) return <div className="loading-page" aria-label="Loading appointments"><div className="skeleton heading" /><div className="skeleton hero" /><div className="skeleton card" /><div className="skeleton card" /></div>
    if (view === 'details' && selectedAppointment) return <AppointmentDetail appointment={selectedAppointment} contact={contacts.find((contact) => contact.id === selectedAppointment.contactId)} adminMode={adminMode} onBack={() => navigate(detailBackView)} onEdit={() => setModal({ type: 'appointment', appointment: selectedAppointment })} onCancel={() => setModal({ type: 'cancel', appointment: selectedAppointment })} onDelete={() => setModal({ type: 'delete', appointment: selectedAppointment })} />
    if (view === 'calendar') return <CalendarView appointments={appointments} contacts={contacts} selectedDate={selectedDate} onSelectDate={setSelectedDate} onOpenAppointment={openAppointment} />
    if (view === 'contacts') return <ContactsPage contacts={contacts} adminMode={adminMode} onEdit={(contact) => setModal({ type: 'contact', contact })} onAdd={() => setModal({ type: 'contact' })} />
    if (view === 'settings') return <SettingsPage configured={isSupabaseConfigured} role={accessRole ?? null} userEmail={session?.user.email ?? ''} onLogout={logout} onResetDemo={resetDemo} />
    return <HomePage appointments={appointments} contacts={contacts} onOpen={openAppointment} />
  }, [accessRole, adminMode, appointments, contacts, detailBackView, loading, selectedAppointment, selectedDate, session?.user.email, view])

  if (isSupabaseConfigured && !authReady) return <AuthLoadingPage />
  if (isSupabaseConfigured && !session) return <SignInPage onLogin={login} />
  if (isSupabaseConfigured && accessRole === undefined) return <AuthLoadingPage />
  if (isSupabaseConfigured && accessRole === null) return <AccessPendingPage email={session?.user.email ?? ''} onLogout={logout} />

  return <div className="app-shell">
    <AppHeader adminMode={adminMode} canAdmin={canAdmin} onHome={() => navigate('home')} onAdminToggle={() => isSupabaseConfigured ? setAdminEnabled((value) => !value) : setDemoAdmin((value) => !value)} onAccount={() => navigate('settings')} />
    <main id="main-content">
      {!online && <Notice tone="error">You’re offline. Saved information is still available, but changes may not sync.</Notice>}
      {!isSupabaseConfigured && view !== 'settings' && <div className="demo-banner"><span>Demo mode</span><p>Sample data · saved on this device</p></div>}
      {loadError && <Notice tone="error">{loadError} <button type="button" onClick={() => void loadData()}>Try again</button></Notice>}
      {page}
    </main>
    {adminMode && view !== 'details' && view !== 'settings' && <FloatingAddButton label={view === 'contacts' ? 'Add contact' : 'Add appointment'} onClick={() => setModal(view === 'contacts' ? { type: 'contact' } : { type: 'appointment' })} />}
    <BottomNavigation current={view} onChange={navigate} />
    {message && <div className="toast" role="status">{message}</div>}
    {modal?.type === 'appointment' && <Modal title={modal.appointment ? 'Edit appointment' : 'Add appointment'} subtitle={modal.appointment ? 'Update the details below.' : 'Add the details Mama needs.'} onClose={() => setModal(null)}><AppointmentForm appointment={modal.appointment} contacts={contacts} prefilledDate={view === 'calendar' ? selectedDate : undefined} onSave={(draft) => saveAppointment(draft, modal.appointment)} onAddContact={(draft) => saveContact(draft)} onCancel={() => setModal(null)} busy={busy} /></Modal>}
    {modal?.type === 'contact' && <Modal title={modal.contact ? 'Edit contact' : 'Add contact'} subtitle="Keep contact details simple and useful." onClose={() => setModal(null)}><ContactForm contact={modal.contact} onSave={(draft) => saveContact(draft, modal.contact).then(() => undefined)} onCancel={() => setModal(null)} busy={busy} /></Modal>}
    {modal?.type === 'cancel' && <ConfirmDialog title="Was appointment cancelled?" message="It will stay in the calendar with cancelled label." cancelLabel="No, keep appointment" confirmLabel="Yes, Appointment Cancelled" onCancel={() => setModal(null)} onConfirm={() => void cancelAppointment(modal.appointment)} />}
    {modal?.type === 'delete' && <ConfirmDialog title="Delete this appointment?" message="This permanently removes the appointment. This cannot be undone." confirmLabel={busy ? 'Deleting…' : 'Delete appointment'} danger onCancel={() => setModal(null)} onConfirm={() => void deleteAppointment(modal.appointment)} />}
  </div>
}

export default App
