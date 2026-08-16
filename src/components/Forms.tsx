import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Appointment, AppointmentDraft, Doctor, DoctorDraft } from '../types'
import { toDateInputValue } from '../utils/date'
import { Icon } from './Icon'

export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

const emptyDoctor: DoctorDraft = { name: '', specialty: '', hospital: '', phone: '', notes: '' }

export function DoctorForm({ doctor, onSave, onCancel, busy = false }: { doctor?: Doctor; onSave: (draft: DoctorDraft) => Promise<void>; onCancel: () => void; busy?: boolean }) {
  const [form, setForm] = useState<DoctorDraft>(doctor ? { name: doctor.name, specialty: doctor.specialty, hospital: doctor.hospital, phone: doctor.phone, notes: doctor.notes } : emptyDoctor)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Please enter a name.'
    if (!form.specialty.trim()) nextErrors.specialty = 'Please enter a profession or specialty.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await onSave({ ...form, name: form.name.trim(), specialty: form.specialty.trim() })
  }

  function field<K extends keyof DoctorDraft>(key: K, value: DoctorDraft[K]) { setForm((current) => ({ ...current, [key]: value })) }

  return <form className="app-form" onSubmit={submit} noValidate>
    <label>Name <span aria-hidden="true">*</span><input value={form.name} onChange={(e) => field('name', e.target.value)} autoFocus aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
    <label>Profession / Specialty <span aria-hidden="true">*</span><input value={form.specialty} onChange={(e) => field('specialty', e.target.value)} placeholder="e.g. Audiologist" aria-invalid={Boolean(errors.specialty)} />{errors.specialty && <small className="field-error">{errors.specialty}</small>}</label>
    <label>Hospital / Clinic <input value={form.hospital} onChange={(e) => field('hospital', e.target.value)} /></label>
    <label>Phone <input type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} inputMode="tel" /></label>
    <label>Notes <textarea value={form.notes} onChange={(e) => field('notes', e.target.value)} rows={3} /></label>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : doctor ? 'Save changes' : 'Add doctor'}</button></div>
  </form>
}

function draftFromAppointment(appointment?: Appointment, prefilledDate?: string): AppointmentDraft {
  if (appointment) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = appointment
    return draft
  }
  return { date: prefilledDate || toDateInputValue(new Date()), startTime: '09:00', endTime: '', purpose: '', doctorId: '', locationName: '', address: '', phone: '', mapsUrl: '', notes: '', thingsToBring: [], status: 'confirmed' }
}

export function AppointmentForm({ appointment, doctors, prefilledDate, onSave, onAddDoctor, onCancel, busy = false }: { appointment?: Appointment; doctors: Doctor[]; prefilledDate?: string; onSave: (draft: AppointmentDraft) => Promise<void>; onAddDoctor: (draft: DoctorDraft) => Promise<Doctor>; onCancel: () => void; busy?: boolean }) {
  const [form, setForm] = useState(() => draftFromAppointment(appointment, prefilledDate))
  const [doctorSearch, setDoctorSearch] = useState(() => doctors.find((doctor) => doctor.id === form.doctorId)?.name ?? '')
  const [doctorMenuOpen, setDoctorMenuOpen] = useState(false)
  const [addingDoctor, setAddingDoctor] = useState(false)
  const [bringInput, setBringInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredDoctors = useMemo(() => doctors.filter((doctor) => `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(doctorSearch.toLowerCase())), [doctorSearch, doctors])
  const selectedDoctor = doctors.find((doctor) => doctor.id === form.doctorId)

  function field<K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) { setForm((current) => ({ ...current, [key]: value })) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.date) nextErrors.date = 'Please choose a date.'
    if (!form.startTime) nextErrors.startTime = 'Please choose a start time.'
    if (!form.purpose.trim()) nextErrors.purpose = 'Please enter the purpose of the visit.'
    if (form.endTime && form.startTime && form.endTime < form.startTime) nextErrors.endTime = 'End time must be after the start time.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await onSave({ ...form, purpose: form.purpose.trim(), thingsToBring: form.thingsToBring.filter(Boolean) })
  }

  function chooseDoctor(doctor: Doctor) {
    field('doctorId', doctor.id)
    setDoctorSearch(doctor.name)
    setDoctorMenuOpen(false)
  }

  function addBringItem() {
    const item = bringInput.trim()
    if (item && !form.thingsToBring.includes(item)) field('thingsToBring', [...form.thingsToBring, item])
    setBringInput('')
  }

  if (addingDoctor) return <div><button className="back-button inset" type="button" onClick={() => setAddingDoctor(false)}><Icon name="back" />Back to appointment</button><DoctorForm onCancel={() => setAddingDoctor(false)} onSave={async (draft) => { const doctor = await onAddDoctor(draft); chooseDoctor(doctor); setAddingDoctor(false) }} /></div>

  return <form className="app-form appointment-form" onSubmit={submit} noValidate>
    <div className="form-grid two">
      <label>Date <span aria-hidden="true">*</span><input type="date" value={form.date} onChange={(e) => field('date', e.target.value)} aria-invalid={Boolean(errors.date)} />{errors.date && <small className="field-error">{errors.date}</small>}</label>
      <label>Status <select value={form.status} onChange={(e) => field('status', e.target.value as AppointmentDraft['status'])}><option value="confirmed">Confirmed</option><option value="tentative">Tentative</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></label>
    </div>
    <div className="form-grid two">
      <label>Start time <span aria-hidden="true">*</span><input type="time" value={form.startTime} onChange={(e) => field('startTime', e.target.value)} aria-invalid={Boolean(errors.startTime)} />{errors.startTime && <small className="field-error">{errors.startTime}</small>}</label>
      <label>End time <span className="optional">Optional</span><input type="time" value={form.endTime} onChange={(e) => field('endTime', e.target.value)} aria-invalid={Boolean(errors.endTime)} />{errors.endTime && <small className="field-error">{errors.endTime}</small>}</label>
    </div>
    <label>Purpose <span aria-hidden="true">*</span><input value={form.purpose} onChange={(e) => field('purpose', e.target.value)} placeholder="e.g. Audiogram" aria-invalid={Boolean(errors.purpose)} />{errors.purpose && <small className="field-error">{errors.purpose}</small>}</label>
    <div className="doctor-field">
      <label htmlFor="doctor-search">Doctor or care provider <span className="optional">Optional</span></label>
      <input id="doctor-search" value={doctorSearch} onFocus={() => setDoctorMenuOpen(true)} onChange={(e) => { setDoctorSearch(e.target.value); field('doctorId', ''); setDoctorMenuOpen(true) }} placeholder="Search doctors" autoComplete="off" />
      {doctorMenuOpen && <div className="doctor-options" role="listbox">
        {filteredDoctors.map((doctor) => <button key={doctor.id} type="button" role="option" aria-selected={doctor.id === form.doctorId} onClick={() => chooseDoctor(doctor)}><strong>{doctor.name}</strong><span>{doctor.specialty}</span></button>)}
        {filteredDoctors.length === 0 && <p>No matching doctors.</p>}
        <button className="add-doctor-option" type="button" onClick={() => setAddingDoctor(true)}><Icon name="plus" /><strong>Add New Doctor</strong></button>
      </div>}
      {selectedDoctor && <p className="selected-specialty"><Icon name="check" />{selectedDoctor.specialty}{selectedDoctor.hospital ? ` · ${selectedDoctor.hospital}` : ''}</p>}
    </div>
    <label>Location <span className="optional">Optional</span><input value={form.locationName} onChange={(e) => field('locationName', e.target.value)} placeholder="Hospital or clinic" /></label>
    <label>Address <span className="optional">Optional</span><input value={form.address} onChange={(e) => field('address', e.target.value)} /></label>
    <div className="form-grid two"><label>Clinic phone <input type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} /></label><label>Maps URL <input type="url" value={form.mapsUrl} onChange={(e) => field('mapsUrl', e.target.value)} /></label></div>
    <fieldset className="bring-field"><legend>Things to bring <span className="optional">Optional</span></legend><div className="inline-input"><input value={bringInput} onChange={(e) => setBringInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBringItem() } }} placeholder="Add one item" /><button className="button secondary" type="button" onClick={addBringItem}>Add</button></div>{form.thingsToBring.length > 0 && <ul className="tag-list">{form.thingsToBring.map((item) => <li key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => field('thingsToBring', form.thingsToBring.filter((value) => value !== item))}><Icon name="close" /></button></li>)}</ul>}</fieldset>
    <label>Notes <span className="optional">Optional</span><textarea value={form.notes} onChange={(e) => field('notes', e.target.value)} rows={4} placeholder="Helpful reminders only" /></label>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : appointment ? 'Save changes' : 'Add appointment'}</button></div>
  </form>
}

export function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <Modal title={title} onClose={onCancel}><p className="confirm-message">{message}</p><div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Keep appointment</button><button className={`button ${danger ? 'danger' : 'primary'}`} type="button" onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}
