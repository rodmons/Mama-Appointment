import { useEffect, useRef, useState } from 'react'
import type { Contact, Medication, MedicationDraft, MedicationStatus } from '../types'
import { EmptyState, FloatingAddButton, Notice, PageIntro } from '../components/Layout'
import { Modal } from '../components/Forms'
import { Icon } from '../components/Icon'
import { MedicationForm, medicationStatusLabels } from '../components/MedicationForm'
import { medicationService } from '../services/medicationService'
import { formatLongDate } from '../utils/date'

type Dialog = { type: 'add' } | { type: 'detail' | 'edit' | 'delete'; medication: Medication } | null
const statuses: MedicationStatus[] = ['active', 'completed', 'discontinued', 'on_hold']

export function MedicationsPage({ contacts, adminMode }: { contacts: Contact[]; adminMode: boolean }) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reload, setReload] = useState(0)
  const saving = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    void medicationService.load().then((items) => { if (active) setMedications(items) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Medications could not be loaded. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])
  useEffect(() => {
    if (!adminMode) setDialog((current) => current && current.type !== 'detail' ? null : current)
  }, [adminMode])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 3500); return () => window.clearTimeout(timer) }, [message])

  function open(next: Dialog) { setActionError(''); setDialog(next) }
  function close() { if (!saving.current) open(null) }
  async function save(draft: MedicationDraft) {
    if (!adminMode || saving.current) return
    saving.current = true; setBusy(true)
    try {
      const id = dialog?.type === 'edit' ? dialog.medication.id : undefined
      const saved = await medicationService.save(draft, id)
      setMedications((items) => id ? items.map((item) => item.id === id ? saved : item) : [...items, saved])
      setDialog({ type: 'detail', medication: saved }); setMessage(id ? 'Medication updated.' : 'Medication added.')
    } finally { saving.current = false; setBusy(false) }
  }
  async function remove(medication: Medication) {
    if (!adminMode || saving.current) return
    saving.current = true; setBusy(true); setActionError('')
    try {
      await medicationService.delete(medication.id)
      setMedications((items) => items.filter((item) => item.id !== medication.id)); setDialog(null); setMessage('Medication deleted.')
    } catch (error) { setActionError(error instanceof Error ? error.message : 'The medication could not be deleted. Please try again.') }
    finally { saving.current = false; setBusy(false) }
  }
  const selected = dialog && dialog.type !== 'add' ? dialog.medication : undefined
  return <div className="medications-page">
    <PageIntro eyebrow="Medication records" title="Medications" />
    {adminMode && !loading && !loadError && <FloatingAddButton label="Add MEDS" onClick={() => open({ type: 'add' })} />}
    {loading ? <p role="status">Loading medications…</p> : loadError ? <Notice tone="error">{loadError} <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></Notice> : medications.length ? statuses.map((status) => {
      // oxlint-disable-next-line unicorn/no-array-sort -- filter creates a new array; retain ES2022 support.
      const items = medications.filter((item) => item.status === status).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id))
      return items.length ? <section className="medication-group" key={status} aria-labelledby={`medication-${status}`}><h2 id={`medication-${status}`}>{medicationStatusLabels[status]}</h2><div className="medication-grid">{items.map((item) => <article className="medication-card" key={item.id}>
        <div className="medication-summary" title={[item.name, item.dosage, item.reason].filter(Boolean).join(' · ')}><h3>{item.name}</h3>{item.dosage && <span className="medication-dosage"> {item.dosage}</span>}{item.reason && <span className="medication-reason"> - {item.reason}</span>}</div>
        <button className="button small secondary" type="button" aria-label={`More Info for ${item.name}`} onClick={() => open({ type: 'detail', medication: item })}>More Info</button>
      </article>)}</div></section> : null
    }) : <EmptyState title="No medications added yet." text={adminMode ? 'Use Add MEDS to record the first medication.' : 'Medication records will appear here. An admin can add them in Admin Mode.'} />}
    {message && <div className="toast" role="status">{message}</div>}
    {(dialog?.type === 'add' || dialog?.type === 'edit') && adminMode && <Modal title={dialog.type === 'edit' ? 'Edit Medication' : 'Add Medication'} onClose={close}><MedicationForm key={dialog.type === 'edit' ? dialog.medication.id : 'new'} medication={dialog.type === 'edit' ? dialog.medication : undefined} contacts={contacts} busy={busy} onSave={save} onCancel={close} /></Modal>}
    {dialog?.type === 'detail' && selected && <Modal title={selected.name} onClose={close}>
      <dl className="medication-details">
        <div><dt>Status</dt><dd><span className={`status-pill medication-status-${selected.status}`}>{medicationStatusLabels[selected.status]}</span></dd></div>
        {[
          ['Medication Form', selected.medicationForm], ['Dosage', selected.dosage], ['Frequency', selected.frequency], ['Reason for Prescription', selected.reason],
          ['Start Date', selected.startDate ? formatLongDate(selected.startDate) : ''], ['Prescribing Doctor', contacts.find((contact) => contact.id === selected.providerId)?.name || selected.prescribingDoctor], ['Notes', selected.notes],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not specified'}</dd></div>)}
      </dl>
      <div className="medication-actions">{adminMode && <><button className="button secondary" type="button" onClick={() => open({ type: 'edit', medication: selected })}><Icon name="edit" />Edit</button><button className="button danger" type="button" onClick={() => open({ type: 'delete', medication: selected })}><Icon name="trash" />Delete</button></>}<button className="button secondary" type="button" onClick={close}>Close</button></div>
    </Modal>}
    {dialog?.type === 'delete' && adminMode && <Modal title="Delete medication?" onClose={close}>
      {actionError && <Notice tone="error">{actionError}</Notice>}
      <p className="confirm-message">Permanently delete <strong>{dialog.medication.name}</strong>? This cannot be undone.</p>
      <div className="form-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => open({ type: 'detail', medication: dialog.medication })}>Keep medication</button><button className="button danger" type="button" disabled={busy} onClick={() => void remove(dialog.medication)}>{busy ? 'Deleting…' : 'Yes, delete'}</button></div>
    </Modal>}
  </div>
}
