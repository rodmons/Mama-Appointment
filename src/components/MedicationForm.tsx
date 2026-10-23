import { useState, type FormEvent } from 'react'
import type { Contact, Medication, MedicationDraft, MedicationStatus } from '../types'

export const medicationStatusLabels: Record<MedicationStatus, string> = {
  active: 'Active', completed: 'Completed', discontinued: 'Discontinued', on_hold: 'On Hold',
}
const formOptions = ['Tablet', 'Capsule', 'Liquid / Syrup', 'Injection', 'IV / Infusion', 'Inhaler', 'Cream / Ointment', 'Drops', 'Patch', 'Powder']
const emptyDraft: MedicationDraft = { name: '', status: 'active', medicationForm: '', startDate: '', dosage: '', frequency: '', reason: '', providerId: '', prescribingDoctor: '', notes: '' }

export function MedicationForm({ medication, contacts, busy, onSave, onCancel }: {
  medication?: Medication; contacts: Contact[]; busy: boolean; onSave: (draft: MedicationDraft) => Promise<void>; onCancel: () => void
}) {
  const [form, setForm] = useState<MedicationDraft>(() => medication ? { ...medication } : { ...emptyDraft })
  const [formChoice, setFormChoice] = useState(() => medication?.medicationForm ? (formOptions.includes(medication.medicationForm) ? medication.medicationForm : 'Other') : '')
  const [doctorChoice, setDoctorChoice] = useState(() => medication?.providerId || (medication?.prescribingDoctor ? 'manual' : ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  // oxlint-disable-next-line unicorn/no-array-sort -- Sort a copy for ES2022 browser support.
  const providers = [...contacts].sort((a, b) => a.name.localeCompare(b.name))
  function field<K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Please enter a medication name.'
    if (!Object.hasOwn(medicationStatusLabels, form.status)) next.status = 'Please choose a status.'
    if (formChoice === 'Other' && !form.medicationForm.trim()) next.medicationForm = 'Please enter the medication form, or leave Medication Form unspecified.'
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      await onSave({ name: form.name.trim(), status: form.status, medicationForm: form.medicationForm.trim(), startDate: form.startDate, dosage: form.dosage.trim(), frequency: form.frequency.trim(), reason: form.reason.trim(), providerId: form.providerId, prescribingDoctor: form.prescribingDoctor.trim(), notes: form.notes.trim() })
    } catch (error) { setErrors({ save: error instanceof Error ? error.message : 'The medication could not be saved. Please try again.' }) }
  }
  return <form className="app-form" onSubmit={submit}>
    {errors.save && <div className="notice notice-error" role="alert">{errors.save}</div>}
    <fieldset className="medication-fields" disabled={busy}>
      <label>Medication Name *<input required autoFocus value={form.name} onChange={(e) => field('name', e.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error" role="alert">{errors.name}</small>}</label>
      <div className="form-grid two">
        <label>Status *<select required value={form.status} onChange={(e) => field('status', e.target.value as MedicationStatus)}>{(['active', 'on_hold', 'completed', 'discontinued'] as const).map((status) => <option key={status} value={status}>{medicationStatusLabels[status]}</option>)}</select>{errors.status && <small className="field-error" role="alert">{errors.status}</small>}</label>
        <label>Start Date<input type="date" value={form.startDate} onChange={(e) => field('startDate', e.target.value)} /></label>
      </div>
      <label>Medication Form<select value={formChoice} onChange={(e) => { setFormChoice(e.target.value); field('medicationForm', e.target.value === 'Other' ? '' : e.target.value) }}><option value="">Not specified</option>{formOptions.map((value) => <option key={value}>{value}</option>)}<option>Other</option></select></label>
      {formChoice === 'Other' && <label>Custom Medication Form<input required value={form.medicationForm} onChange={(e) => field('medicationForm', e.target.value)} aria-invalid={Boolean(errors.medicationForm)} />{errors.medicationForm && <small className="field-error" role="alert">{errors.medicationForm}</small>}</label>}
      <div className="form-grid two"><label>Dosage<input value={form.dosage} onChange={(e) => field('dosage', e.target.value)} placeholder="e.g. 5 mg" /></label><label>Frequency<input value={form.frequency} onChange={(e) => field('frequency', e.target.value)} placeholder="e.g. Twice daily" /></label></div>
      <label>Reason for Prescription<input value={form.reason} onChange={(e) => field('reason', e.target.value)} /></label>
      <label>Prescribing Doctor<select value={doctorChoice} onChange={(e) => { const value = e.target.value; setDoctorChoice(value); const provider = contacts.find((item) => item.id === value); setForm((current) => ({ ...current, providerId: provider?.id ?? '', prescribingDoctor: provider?.name ?? '' })) }}><option value="">Not specified</option>{providers.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.roleOrSpecialty ? ` · ${contact.roleOrSpecialty}` : ''}</option>)}{form.providerId && !contacts.some((contact) => contact.id === form.providerId) && <option value={form.providerId}>{form.prescribingDoctor || 'Recorded provider'}</option>}<option value="manual">Enter manually</option></select></label>
      {doctorChoice === 'manual' && <label>Doctor Name<input value={form.prescribingDoctor} onChange={(e) => field('prescribingDoctor', e.target.value)} /></label>}
      <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => field('notes', e.target.value)} /></label>
    </fieldset>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
  </form>
}
