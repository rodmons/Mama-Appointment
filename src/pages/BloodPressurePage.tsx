import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EmptyState, FloatingAddButton, Notice, PageIntro } from '../components/Layout'
import { Modal } from '../components/Forms'
import { Icon } from '../components/Icon'
import type { BloodPressureDraft, BloodPressureReading, PillTiming } from '../types'
import { bloodPressureService, newestReadingsFirst } from '../services/bloodPressureService'
import { toDateInputValue } from '../utils/date'

function BloodPressureForm({ reading, busy, onSave, onCancel }: { reading?: BloodPressureReading; busy: boolean; onSave: (draft: BloodPressureDraft) => Promise<void>; onCancel: () => void }) {
  const [takenAt, setTakenAt] = useState(() => {
    const now = reading ? new Date(reading.takenAt) : new Date()
    return `${toDateInputValue(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [systolic, setSystolic] = useState(reading ? String(reading.systolic) : '')
  const [diastolic, setDiastolic] = useState(reading ? String(reading.diastolic) : '')
  const [pulse, setPulse] = useState(reading ? String(reading.pulse) : '')
  const [pillTiming, setPillTiming] = useState<PillTiming | ''>(reading?.pillTiming ?? '')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    const date = new Date(takenAt)
    if (!Number.isFinite(date.getTime()) || !pillTiming || [systolic, diastolic, pulse].some((value) => !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 999)) {
      setError('Enter a date and time, whole numbers from 1 to 999, and before or after pills.')
      return
    }
    try { await onSave({ takenAt: date.toISOString(), systolic: Number(systolic), diastolic: Number(diastolic), pulse: Number(pulse), pillTiming }) }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'The reading could not be saved. Please try again.') }
  }

  return <form className="app-form" onSubmit={submit}>
    {error && <Notice tone="error">{error}</Notice>}
    <fieldset className="medication-fields" disabled={busy}>
      <label>Date<input required autoFocus type="datetime-local" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} /></label>
      <div className="bp-number-fields">
        <label>Systolic<input required type="number" inputMode="numeric" min="1" max="999" step="1" value={systolic} onChange={(event) => setSystolic(event.target.value)} /></label>
        <label>Diastolic<input required type="number" inputMode="numeric" min="1" max="999" step="1" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} /></label>
        <label>Pulse<input required type="number" inputMode="numeric" min="1" max="999" step="1" value={pulse} onChange={(event) => setPulse(event.target.value)} /></label>
      </div>
      <label>Before/After pills<select required value={pillTiming} onChange={(event) => setPillTiming(event.target.value as PillTiming | '')}><option value="">Choose one</option><option value="before">Before pills</option><option value="after">After pills</option></select></label>
    </fieldset>
    <div className="form-actions"><button className="button secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save BP'}</button></div>
  </form>
}

export function BloodPressurePage() {
  const [readings, setReadings] = useState<BloodPressureReading[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState<{ reading?: BloodPressureReading } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const saving = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true); setLoadError('')
    void bloodPressureService.load().then((items) => { if (active) setReadings(items) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Blood pressure readings could not be loaded. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 3500); return () => window.clearTimeout(timer) }, [message])

  function close() { if (!saving.current) setDialog(null) }
  async function save(draft: BloodPressureDraft) {
    if (saving.current) return
    saving.current = true; setBusy(true)
    try {
      const id = dialog?.reading?.id
      const saved = await bloodPressureService.save(draft, id)
      setReadings((items) => newestReadingsFirst(id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]))
      setDialog(null); setMessage(id ? 'BP reading updated.' : 'BP reading added.')
    } finally { saving.current = false; setBusy(false) }
  }

  const totals = readings.reduce((sum, reading) => ({ systolic: sum.systolic + reading.systolic, diastolic: sum.diastolic + reading.diastolic, pulse: sum.pulse + reading.pulse }), { systolic: 0, diastolic: 0, pulse: 0 })
  const average = (value: number) => (value / readings.length).toLocaleString('en-CA', { maximumFractionDigits: 1 })

  return <div className="bp-page">
    <PageIntro eyebrow="Daily readings" title="Blood pressure" text="Newest readings first. You can log BP at any time." />
    {loading ? <p role="status">Loading BP readings…</p> : loadError ? <Notice tone="error">{loadError} <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></Notice> : readings.length ? <div className="bp-table-shell"><table className="bp-table" aria-label="Blood pressure readings">
      <thead><tr><th scope="col">Date</th><th scope="col">Systolic</th><th scope="col">Diastolic</th><th scope="col">Pulse</th><th scope="col">Before/After pills</th></tr>
        <tr className="bp-averages" aria-label="Average of all logs"><th scope="row">Average<small>All {readings.length} {readings.length === 1 ? 'log' : 'logs'}</small></th><td>{average(totals.systolic)}<small>mmHg</small></td><td>{average(totals.diastolic)}<small>mmHg</small></td><td>{average(totals.pulse)}<small>bpm</small></td><td aria-label="Not applicable">—</td></tr>
      </thead>
      <tbody>{readings.map((reading) => {
        const date = new Date(reading.takenAt)
        return <tr key={reading.id}><td><time dateTime={reading.takenAt}>{date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}<small>{date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}</small></time><button type="button" className="bp-edit" aria-label={`Edit BP from ${date.toLocaleString('en-CA')}`} onClick={() => setDialog({ reading })}><Icon name="edit" />Edit</button></td><td>{reading.systolic}</td><td>{reading.diastolic}</td><td>{reading.pulse}</td><td>{reading.pillTiming === 'before' ? 'Before pills' : 'After pills'}</td></tr>
      })}</tbody>
    </table></div> : <EmptyState title="No BP readings yet" text="Use Add BP to log the first reading. Admin Mode is not needed." />}
    {!loading && !loadError && <FloatingAddButton label="Add BP" onClick={() => setDialog({})} />}
    {dialog && <Modal title={dialog.reading ? 'Edit BP' : 'Add BP'} subtitle="Record the values shown on the monitor." onClose={close}><BloodPressureForm key={dialog.reading?.id ?? 'new'} reading={dialog.reading} busy={busy} onSave={save} onCancel={close} /></Modal>}
    {message && <div className="toast" role="status">{message}</div>}
  </div>
}
