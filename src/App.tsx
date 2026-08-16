import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppHeader, BottomNavigation, FloatingAddButton, Notice } from './components/Layout'
import { AppointmentDetail } from './components/AppointmentDetail'
import { CalendarView } from './components/CalendarView'
import { AppointmentForm, ConfirmDialog, DoctorForm, Modal } from './components/Forms'
import { HomePage } from './pages/HomePage'
import { DoctorsPage } from './pages/DoctorsPage'
import { SettingsPage } from './pages/SettingsPage'
import { dataService } from './services/dataService'
import { isSupabaseConfigured, supabase } from './services/supabase'
import type { Appointment, AppointmentDraft, AppView, Doctor, DoctorDraft } from './types'
import { toDateInputValue } from './utils/date'

type ModalState =
  | { type: 'appointment'; appointment?: Appointment }
  | { type: 'doctor'; doctor?: Doctor; selectAfterSave?: boolean }
  | { type: 'cancel'; appointment: Appointment }
  | { type: 'delete'; appointment: Appointment }
  | null

function App() {
  const [view, setView] = useState<AppView>('home')
  const [detailBackView, setDetailBackView] = useState<AppView>('home')
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()))
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [demoAdmin, setDemoAdmin] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  const adminMode = isSupabaseConfigured ? Boolean(session) : demoAdmin
  const selectedAppointment = appointments.find((item) => item.id === selectedAppointmentId)

  const loadData = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const data = await dataService.load()
      setAppointments(data.appointments); setDoctors(data.doctors)
    } catch {
      setLoadError('Appointments could not be loaded right now. Please check your connection and try again.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler); window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!adminMode && modal) setModal(null)
  }, [adminMode, modal])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timer)
  }, [message])

  function navigate(nextView: AppView) {
    setView(nextView)
    if (nextView !== 'details') setSelectedAppointmentId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openAppointment(appointment: Appointment) {
    setDetailBackView(view === 'calendar' ? 'calendar' : 'home')
    setSelectedAppointmentId(appointment.id)
    setView('details')
    window.scrollTo({ top: 0 })
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

  async function saveDoctor(draft: DoctorDraft, doctor?: Doctor): Promise<Doctor> {
    setBusy(true)
    try {
      const saved = await dataService.saveDoctor(draft, doctor?.id)
      setDoctors((items) => doctor ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
      if (modal?.type === 'doctor') setModal(null)
      setMessage(doctor ? 'Doctor updated.' : 'Doctor added.')
      return saved
    } catch { setMessage('The doctor could not be saved. Please try again.'); throw new Error('save failed') } finally { setBusy(false) }
  }

  async function cancelAppointment(appointment: Appointment) {
    await saveAppointment({ ...appointment, status: 'cancelled' }, appointment)
    setModal(null); setMessage('Appointment cancelled.')
  }

  async function deleteAppointment(appointment: Appointment) {
    setBusy(true)
    try {
      await dataService.deleteAppointment(appointment.id)
      setAppointments((items) => items.filter((item) => item.id !== appointment.id))
      setModal(null); setSelectedAppointmentId(''); setView('home'); setMessage('Appointment deleted.')
    } catch { setMessage('The appointment could not be deleted. Please try again.') } finally { setBusy(false) }
  }

  async function login(email: string, password: string) {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() { if (supabase) await supabase.auth.signOut() }

  function resetDemo() {
    dataService.resetDemo(); setDemoAdmin(false); setMessage('Demo data restored.'); void loadData(); navigate('home')
  }

  const page = useMemo(() => {
    if (loading) return <div className="loading-page" aria-label="Loading appointments"><div className="skeleton heading" /><div className="skeleton hero" /><div className="skeleton card" /><div className="skeleton card" /></div>
    if (view === 'details' && selectedAppointment) return <AppointmentDetail appointment={selectedAppointment} doctor={doctors.find((doctor) => doctor.id === selectedAppointment.doctorId)} adminMode={adminMode} onBack={() => navigate(detailBackView)} onEdit={() => setModal({ type: 'appointment', appointment: selectedAppointment })} onCancel={() => setModal({ type: 'cancel', appointment: selectedAppointment })} onDelete={() => setModal({ type: 'delete', appointment: selectedAppointment })} />
    if (view === 'calendar') return <><CalendarView appointments={appointments} doctors={doctors} selectedDate={selectedDate} onSelectDate={setSelectedDate} onOpenAppointment={openAppointment} /></>
    if (view === 'doctors') return <DoctorsPage doctors={doctors} adminMode={adminMode} onEdit={(doctor) => setModal({ type: 'doctor', doctor })} onAdd={() => setModal({ type: 'doctor' })} />
    if (view === 'settings') return <SettingsPage configured={isSupabaseConfigured} adminMode={adminMode} userEmail={session?.user.email ?? ''} onDemoToggle={() => setDemoAdmin((value) => !value)} onLogin={login} onLogout={logout} onResetDemo={resetDemo} />
    return <HomePage appointments={appointments} doctors={doctors} onOpen={openAppointment} />
  }, [adminMode, appointments, detailBackView, doctors, loading, selectedAppointment, selectedDate, session?.user.email, view])

  return <div className="app-shell">
    <AppHeader adminMode={adminMode} onSettings={() => navigate('settings')} />
    <main id="main-content">
      {!online && <Notice tone="error">You’re offline. Saved information is still available, but changes may not sync.</Notice>}
      {!isSupabaseConfigured && view !== 'settings' && <div className="demo-banner"><span>Demo mode</span><p>Sample data · saved on this device</p></div>}
      {loadError && <Notice tone="error">{loadError} <button type="button" onClick={() => void loadData()}>Try again</button></Notice>}
      {page}
    </main>
    {adminMode && view !== 'details' && view !== 'settings' && <FloatingAddButton label={view === 'doctors' ? 'Add doctor' : 'Add appointment'} onClick={() => setModal(view === 'doctors' ? { type: 'doctor' } : { type: 'appointment' })} />}
    <BottomNavigation current={view} onChange={navigate} />
    {message && <div className="toast" role="status">{message}</div>}
    {modal?.type === 'appointment' && <Modal title={modal.appointment ? 'Edit appointment' : 'Add appointment'} subtitle={modal.appointment ? 'Update the details below.' : 'Add the details Mama needs.'} onClose={() => setModal(null)}><AppointmentForm appointment={modal.appointment} doctors={doctors} prefilledDate={view === 'calendar' ? selectedDate : undefined} onSave={(draft) => saveAppointment(draft, modal.appointment)} onAddDoctor={(draft) => saveDoctor(draft)} onCancel={() => setModal(null)} busy={busy} /></Modal>}
    {modal?.type === 'doctor' && <Modal title={modal.doctor ? 'Edit doctor' : 'Add doctor'} subtitle="Keep contact details simple and useful." onClose={() => setModal(null)}><DoctorForm doctor={modal.doctor} onSave={(draft) => saveDoctor(draft, modal.doctor).then(() => undefined)} onCancel={() => setModal(null)} busy={busy} /></Modal>}
    {modal?.type === 'cancel' && <ConfirmDialog title="Cancel this appointment?" message="It will stay in the calendar with a cancelled label." confirmLabel="Yes, cancel it" onCancel={() => setModal(null)} onConfirm={() => void cancelAppointment(modal.appointment)} />}
    {modal?.type === 'delete' && <ConfirmDialog title="Delete this appointment?" message="This permanently removes the appointment. This cannot be undone." confirmLabel={busy ? 'Deleting…' : 'Delete appointment'} danger onCancel={() => setModal(null)} onConfirm={() => void deleteAppointment(modal.appointment)} />}
  </div>
}

export default App
