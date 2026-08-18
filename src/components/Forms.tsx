import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Appointment, AppointmentDraft, Contact, ContactDraft, ContactType } from '../types'
import { toDateInputValue } from '../utils/date'
import { Icon } from './Icon'

export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header className="modal-header"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
    <div className="modal-body">{children}</div>
  </section></div>
}

export const contactTypeLabels: Record<ContactType, string> = {
  doctor: 'Doctor', nurse: 'Nurse / Nurse Practitioner', clinic: 'Clinic', hospital: 'Hospital', pharmacy: 'Pharmacy',
  personal: 'Personal contact', transportation: 'Transportation', other: 'Other',
}

const emptyContact: ContactDraft = { name: '', contactType: 'doctor', roleOrSpecialty: '', organization: '', phone: '', notes: '' }

export function ContactForm({ contact, onSave, onCancel, busy = false }: { contact?: Contact; onSave: (draft: ContactDraft) => Promise<void>; onCancel: () => void; busy?: boolean }) {
  const [form, setForm] = useState<ContactDraft>(contact ? { name: contact.name, contactType: contact.contactType, roleOrSpecialty: contact.roleOrSpecialty, organization: contact.organization, phone: contact.phone, notes: contact.notes } : emptyContact)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Please enter a name or contact label.'
    if ((form.contactType === 'doctor' || form.contactType === 'nurse') && !form.roleOrSpecialty.trim()) nextErrors.roleOrSpecialty = 'Please enter a profession or specialty.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await onSave({ ...form, name: form.name.trim(), roleOrSpecialty: form.roleOrSpecialty.trim() })
  }

  function field<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) { setForm((current) => ({ ...current, [key]: value })) }

  return <form className="app-form" onSubmit={submit} noValidate>
    <label>Name or contact label <span aria-hidden="true">*</span><input value={form.name} onChange={(e) => field('name', e.target.value)} autoFocus aria-invalid={Boolean(errors.name)} placeholder="e.g. Dr. Lu or BC Cancer Reception" />{errors.name && <small className="field-error">{errors.name}</small>}</label>
    <label>Contact type <span aria-hidden="true">*</span><select value={form.contactType} onChange={(e) => field('contactType', e.target.value as ContactType)}>{Object.entries(contactTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Profession / Specialty <span className="optional">{form.contactType === 'doctor' || form.contactType === 'nurse' ? 'Required' : 'Optional'}</span><input value={form.roleOrSpecialty} onChange={(e) => field('roleOrSpecialty', e.target.value)} placeholder="e.g. Audiologist" aria-invalid={Boolean(errors.roleOrSpecialty)} />{errors.roleOrSpecialty && <small className="field-error">{errors.roleOrSpecialty}</small>}</label>
    <label>Organization <span className="optional">Optional</span><input value={form.organization} onChange={(e) => field('organization', e.target.value)} placeholder="Hospital, clinic, or company" /></label>
    <label>Phone <span className="optional">Optional</span><input type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} inputMode="tel" /></label>
    <label>Notes <span className="optional">Optional</span><textarea value={form.notes} onChange={(e) => field('notes', e.target.value)} rows={3} /></label>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}</button></div>
  </form>
}

function draftFromAppointment(appointment?: Appointment, prefilledDate?: string): AppointmentDraft {
  if (appointment) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = appointment
    return draft
  }
  return { date: prefilledDate || toDateInputValue(new Date()), startTime: '09:00', endTime: '', purpose: '', contactId: '', locationName: '', address: '', phone: '', mapsUrl: '', notes: '', thingsToBring: [], status: 'confirmed' }
}

export function AppointmentForm({ appointment, contacts, prefilledDate, onSave, onAddContact, onCancel, busy = false }: { appointment?: Appointment; contacts: Contact[]; prefilledDate?: string; onSave: (draft: AppointmentDraft) => Promise<void>; onAddContact: (draft: ContactDraft) => Promise<Contact>; onCancel: () => void; busy?: boolean }) {
  const [form, setForm] = useState(() => draftFromAppointment(appointment, prefilledDate))
  const [contactSearch, setContactSearch] = useState(() => contacts.find((contact) => contact.id === form.contactId)?.name ?? '')
  const [contactMenuOpen, setContactMenuOpen] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [bringInput, setBringInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredContacts = useMemo(() => contacts.filter((contact) => `${contact.name} ${contact.roleOrSpecialty} ${contact.organization}`.toLowerCase().includes(contactSearch.toLowerCase())), [contactSearch, contacts])
  const selectedContact = contacts.find((contact) => contact.id === form.contactId)

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

  function chooseContact(contact: Contact) { field('contactId', contact.id); setContactSearch(contact.name); setContactMenuOpen(false) }
  function addBringItem() { const item = bringInput.trim(); if (item && !form.thingsToBring.includes(item)) field('thingsToBring', [...form.thingsToBring, item]); setBringInput('') }

  if (addingContact) return <div><button className="back-button inset" type="button" onClick={() => setAddingContact(false)}><Icon name="back" />Back to appointment</button><ContactForm onCancel={() => setAddingContact(false)} onSave={async (draft) => { const contact = await onAddContact(draft); chooseContact(contact); setAddingContact(false) }} /></div>

  return <form className="app-form appointment-form" onSubmit={submit} noValidate>
    <div className="form-grid two"><label>Date <span aria-hidden="true">*</span><input type="date" value={form.date} onChange={(e) => field('date', e.target.value)} aria-invalid={Boolean(errors.date)} />{errors.date && <small className="field-error">{errors.date}</small>}</label><label>Status <select value={form.status} onChange={(e) => field('status', e.target.value as AppointmentDraft['status'])}><option value="confirmed">Confirmed</option><option value="tentative">Tentative</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></label></div>
    <div className="form-grid two"><label>Start time <span aria-hidden="true">*</span><input type="time" value={form.startTime} onChange={(e) => field('startTime', e.target.value)} aria-invalid={Boolean(errors.startTime)} />{errors.startTime && <small className="field-error">{errors.startTime}</small>}</label><label>End time <span className="optional">Optional</span><input type="time" value={form.endTime} onChange={(e) => field('endTime', e.target.value)} aria-invalid={Boolean(errors.endTime)} />{errors.endTime && <small className="field-error">{errors.endTime}</small>}</label></div>
    <label>Purpose <span aria-hidden="true">*</span><input value={form.purpose} onChange={(e) => field('purpose', e.target.value)} placeholder="e.g. Audiogram" aria-invalid={Boolean(errors.purpose)} />{errors.purpose && <small className="field-error">{errors.purpose}</small>}</label>
    <div className="doctor-field"><label htmlFor="contact-search">Primary contact <span className="optional">Optional</span></label><input id="contact-search" value={contactSearch} onFocus={() => setContactMenuOpen(true)} onChange={(e) => { setContactSearch(e.target.value); field('contactId', ''); setContactMenuOpen(true) }} placeholder="Search contacts" autoComplete="off" />
      {contactMenuOpen && <div className="doctor-options" role="listbox">{filteredContacts.map((contact) => <button key={contact.id} type="button" role="option" aria-selected={contact.id === form.contactId} onClick={() => chooseContact(contact)}><strong>{contact.name}</strong><span>{contact.roleOrSpecialty || contactTypeLabels[contact.contactType]}</span></button>)}{filteredContacts.length === 0 && <p>No matching contacts.</p>}<button className="add-doctor-option" type="button" onClick={() => setAddingContact(true)}><Icon name="plus" /><strong>Add New Contact</strong></button></div>}
      {selectedContact && <p className="selected-specialty"><Icon name="check" />{selectedContact.roleOrSpecialty || contactTypeLabels[selectedContact.contactType]}{selectedContact.organization ? ` · ${selectedContact.organization}` : ''}</p>}
    </div>
    <label>Location <span className="optional">Optional</span><input value={form.locationName} onChange={(e) => field('locationName', e.target.value)} placeholder="Hospital or clinic" /></label>
    <label>Address <span className="optional">Optional</span><input value={form.address} onChange={(e) => field('address', e.target.value)} /></label>
    <div className="form-grid two"><label>Contact phone <input type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} /></label><label>Maps URL <input type="url" value={form.mapsUrl} onChange={(e) => field('mapsUrl', e.target.value)} /></label></div>
    <fieldset className="bring-field"><legend>Things to bring <span className="optional">Optional</span></legend><div className="inline-input"><input value={bringInput} onChange={(e) => setBringInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBringItem() } }} placeholder="Add one item" /><button className="button secondary" type="button" onClick={addBringItem}>Add</button></div>{form.thingsToBring.length > 0 && <ul className="tag-list">{form.thingsToBring.map((item) => <li key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => field('thingsToBring', form.thingsToBring.filter((value) => value !== item))}><Icon name="close" /></button></li>)}</ul>}</fieldset>
    <label>Notes <span className="optional">Optional</span><textarea value={form.notes} onChange={(e) => field('notes', e.target.value)} rows={4} placeholder="Helpful reminders only" /></label>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : appointment ? 'Save changes' : 'Add appointment'}</button></div>
  </form>
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Keep appointment', danger = false, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <Modal title={title} onClose={onCancel}><p className="confirm-message">{message}</p><div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>{cancelLabel}</button><button className={`button ${danger ? 'danger' : 'primary'}`} type="button" onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}
