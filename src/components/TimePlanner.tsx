import { useEffect, useMemo, useState } from 'react'
import { dayOffsetLabel, formatPlannerTime, minutesToTimeParts, timePartsToMinutes } from '../utils/timePlanner'

type DurationUnit = 'minutes' | 'hours'
type DurationKey = 'contingency' | 'parking' | 'drive' | 'gettingReady'
type DurationValue = { amount: string; unit: DurationUnit }
type PlannerState = { appointmentMinutes: number; durations: Record<DurationKey, DurationValue> }

const STORAGE_KEY = 'mama-mona-time-planner'
const defaults: PlannerState = {
  appointmentMinutes: 9 * 60 + 30,
  durations: {
    contingency: { amount: '15', unit: 'minutes' },
    parking: { amount: '15', unit: 'minutes' },
    drive: { amount: '60', unit: 'minutes' },
    gettingReady: { amount: '30', unit: 'minutes' },
  },
}

const durationFields: Array<{ key: DurationKey; label: string }> = [
  { key: 'contingency', label: 'Contingency' },
  { key: 'parking', label: 'Parking / Walking' },
  { key: 'drive', label: 'Drive' },
  { key: 'gettingReady', label: 'Getting Ready' },
]

function durationMinutes(value: DurationValue) {
  const amount = Number(value.amount)
  if (value.amount.trim() === '' || !Number.isFinite(amount) || amount < 0) return null
  if (value.unit === 'minutes' && !Number.isInteger(amount)) return null
  return Math.round(amount * (value.unit === 'hours' ? 60 : 1))
}

function savedState(): PlannerState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<PlannerState> | null
    if (!stored || !Number.isInteger(stored.appointmentMinutes) || stored.appointmentMinutes! < 0 || stored.appointmentMinutes! >= 24 * 60) return defaults
    const durations = stored.durations
    if (!durations || durationFields.some(({ key }) => !durations[key] || durationMinutes(durations[key]!) === null)) return defaults
    return { appointmentMinutes: stored.appointmentMinutes!, durations: durations as Record<DurationKey, DurationValue> }
  } catch {
    return defaults
  }
}

export function TimePlanner() {
  const [planner, setPlanner] = useState<PlannerState>(savedState)
  const appointment = minutesToTimeParts(planner.appointmentMinutes)
  const calculated = useMemo(() => {
    const durations = Object.fromEntries(durationFields.map(({ key }) => [key, durationMinutes(planner.durations[key])])) as Record<DurationKey, number | null>
    if (Object.values(durations).some((value) => value === null)) return null
    const leaveBy = planner.appointmentMinutes - durations.contingency! - durations.parking! - durations.drive!
    return { leaveBy, getReady: leaveBy - durations.gettingReady! }
  }, [planner])

  useEffect(() => {
    if (!calculated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(planner)) } catch { /* Local storage may be unavailable in private browsing. */ }
  }, [calculated, planner])

  function setAppointment(part: 'hour' | 'minute' | 'period', value: string) {
    const next = { ...appointment, [part]: part === 'period' ? value : Number(value) }
    setPlanner((current) => ({ ...current, appointmentMinutes: timePartsToMinutes(next.hour, next.minute, next.period as 'AM' | 'PM') }))
  }

  function setDuration(key: DurationKey, update: Partial<DurationValue>) {
    setPlanner((current) => ({ ...current, durations: { ...current.durations, [key]: { ...current.durations[key], ...update } } }))
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* Local storage may be unavailable. */ }
    setPlanner(defaults)
  }

  return <div className="time-planner">
    <div className="planner-fields app-form">
      <fieldset className="planner-field">
        <legend>Appointment time</legend>
        <div className="planner-time-inputs">
          <label><span className="sr-only">Appointment hour</span><select aria-label="Appointment hour" value={appointment.hour} onChange={(event) => setAppointment('hour', event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>
          <span aria-hidden="true">:</span>
          <label><span className="sr-only">Appointment minute</span><select aria-label="Appointment minute" value={appointment.minute} onChange={(event) => setAppointment('minute', event.target.value)}>{Array.from({ length: 60 }, (_, minute) => <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>)}</select></label>
          <label><span className="sr-only">Appointment AM or PM</span><select aria-label="Appointment AM or PM" value={appointment.period} onChange={(event) => setAppointment('period', event.target.value)}><option>AM</option><option>PM</option></select></label>
        </div>
      </fieldset>
      {durationFields.map(({ key, label }) => {
        const invalid = durationMinutes(planner.durations[key]) === null
        return <label className="planner-field" key={key}>{label}<div className="planner-duration-inputs"><input type="number" min="0" step={planner.durations[key].unit === 'hours' ? '0.25' : '1'} inputMode="decimal" aria-label={`${label} amount`} aria-invalid={invalid} value={planner.durations[key].amount} onChange={(event) => setDuration(key, { amount: event.target.value })} /><select aria-label={`${label} unit`} value={planner.durations[key].unit} onChange={(event) => setDuration(key, { unit: event.target.value as DurationUnit })}><option value="minutes">min</option><option value="hours">hrs</option></select></div>{invalid && <small className="field-error">Enter zero or a positive {planner.durations[key].unit === 'minutes' ? 'whole number of minutes' : 'number of hours'}.</small>}</label>
      })}
    </div>

    <section className="planner-result" aria-live="polite">
      <p>Leave by</p>
      <strong>{calculated ? formatPlannerTime(calculated.leaveBy) : '—'}</strong>
      {calculated && dayOffsetLabel(calculated.leaveBy) && <span>{dayOffsetLabel(calculated.leaveBy)}</span>}
    </section>
    <p className="planner-ready">Start Getting Ready: <strong>{calculated ? formatPlannerTime(calculated.getReady) : '—'}</strong>{calculated && dayOffsetLabel(calculated.getReady) && <span> · {dayOffsetLabel(calculated.getReady)}</span>}</p>
    <button className="planner-reset" type="button" onClick={reset}>Reset to defaults</button>
  </div>
}
