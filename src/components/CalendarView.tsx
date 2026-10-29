import { useEffect, useMemo, useRef, useState } from 'react'
import type { Appointment, CalendarNote, Contact } from '../types'
import { formatLongDate, formatMonthYear, monthGrid, toDateInputValue } from '../utils/date'
import { calendarNoteService } from '../services/calendarNoteService'
import { AppointmentCard } from './AppointmentCard'
import { CalendarNoteForm } from './CalendarNoteForm'
import { Modal } from './Forms'
import { EmptyState, Notice } from './Layout'
import { Icon } from './Icon'

type NoteDialog = { type: 'add'; date: string } | { type: 'edit' | 'delete'; note: CalendarNote }

export function CalendarView({ appointments, contacts, selectedDate, onSelectDate, onOpenAppointment, adminMode = false, onDeleteAppointment }: { appointments: Appointment[]; contacts: Contact[]; selectedDate: string; onSelectDate: (date: string) => void; onOpenAppointment: (appointment: Appointment) => void; adminMode?: boolean; onDeleteAppointment?: (appointment: Appointment) => void }) {
  const selected = new Date(`${selectedDate}T00:00:00`)
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const days = useMemo(() => monthGrid(cursor), [cursor])
  const selectedItems = appointments.filter((item) => item.date === selectedDate)
  const today = toDateInputValue(new Date())
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [notesError, setNotesError] = useState('')
  const [reload, setReload] = useState(0)
  const [noteDialog, setNoteDialog] = useState<NoteDialog | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const saving = useRef(false)
  const addNoteButton = useRef<HTMLButtonElement>(null)
  const noteTrigger = useRef<HTMLButtonElement | null>(null)
  const selectedNotes = notes.filter((note) => note.date === selectedDate)
  const noteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const note of notes) counts.set(note.date, (counts.get(note.date) ?? 0) + 1)
    return counts
  }, [notes])

  useEffect(() => {
    let active = true
    setNotesLoading(true); setNotesError('')
    void calendarNoteService.load().then((items) => { if (active) setNotes(items) }).catch((error: unknown) => {
      if (active) setNotesError(error instanceof Error ? error.message : 'Calendar notes could not be loaded. Please try again.')
    }).finally(() => { if (active) setNotesLoading(false) })
    return () => { active = false }
  }, [reload])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 3500); return () => window.clearTimeout(timer) }, [message])
  useEffect(() => {
    if (!adminMode && noteDialog && noteDialog.type !== 'add') setNoteDialog(null)
  }, [adminMode, noteDialog])
  useEffect(() => {
    if (!noteDialog && noteTrigger.current) {
      const target = noteTrigger.current.isConnected ? noteTrigger.current : addNoteButton.current
      target?.focus(); noteTrigger.current = null
    }
  }, [noteDialog])

  function openNote(dialog: NoteDialog, trigger: HTMLButtonElement) {
    noteTrigger.current = trigger; setDeleteError(''); setNoteDialog(dialog)
  }
  function closeNote() { if (!saving.current) setNoteDialog(null) }
  async function saveNote(content: string) {
    if (saving.current || !noteDialog || noteDialog.type === 'delete') return
    const editing = noteDialog.type === 'edit'
    if (editing && !adminMode) throw new Error('Turn on Admin Mode to edit notes.')
    const date = noteDialog.type === 'add' ? noteDialog.date : noteDialog.note.date
    saving.current = true; setBusy(true)
    try {
      const saved = noteDialog.type === 'edit'
        ? await calendarNoteService.save({ date, content }, noteDialog.note.id)
        : await calendarNoteService.save({ date, content })
      setNotes((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
      setNoteDialog(null); setMessage(editing ? 'Note updated.' : 'Note saved.')
    } finally { saving.current = false; setBusy(false) }
  }
  async function deleteNote() {
    if (saving.current || !adminMode || noteDialog?.type !== 'delete') return
    const id = noteDialog.note.id
    saving.current = true; setBusy(true); setDeleteError('')
    try {
      await calendarNoteService.delete(id)
      setNotes((items) => items.filter((item) => item.id !== id))
      setNoteDialog(null); setMessage('Note deleted.')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The note could not be deleted. Please try again.')
    } finally { saving.current = false; setBusy(false) }
  }

  function moveMonth(amount: number) { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)) }

  return <>
    <section className="calendar-card" aria-label="Monthly calendar">
      <div className="calendar-header"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><Icon name="back" /></button><h2>{formatMonthYear(cursor)}</h2><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><Icon name="next" /></button></div>
      <div className="weekday-row" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">{days.map(({ date, inMonth }) => {
        const value = toDateInputValue(date)
        const count = appointments.filter((item) => item.date === value).length
        const noteCount = noteCounts.get(value) ?? 0
        const appointmentState = count ? value < today ? 'previous-appointment' : value > today ? 'upcoming-appointment' : '' : ''
        return <button key={value} className={`${inMonth ? '' : 'outside'} ${value === today ? 'today' : ''} ${value === selectedDate ? 'selected' : ''} ${appointmentState}`} type="button" onClick={() => onSelectDate(value)} aria-label={`${formatLongDate(value)}, ${count} appointment${count === 1 ? '' : 's'}${noteCount ? `, ${noteCount} note${noteCount === 1 ? '' : 's'}` : ''}`} aria-current={value === today ? 'date' : undefined} aria-pressed={value === selectedDate}><span className="calendar-day-number">{date.getDate()}</span>{noteCount > 0 && <i className="calendar-note-dot" aria-hidden="true" />}</button>
      })}</div>
      <div className="calendar-legend" aria-label="Calendar legend"><span><i className="legend-swatch previous" />Previous</span><span><i className="legend-swatch upcoming" />Upcoming</span><span><i className="legend-swatch note" />Note</span></div>
    </section>
    <section className="day-agenda" aria-label="Selected day">
      <div className="day-agenda-header"><div><p className="eyebrow">Selected day</p><h2>{formatLongDate(selectedDate, false)}</h2></div><button ref={addNoteButton} className="floating-add floating-add-labeled calendar-add-note" type="button" onClick={(event) => openNote({ type: 'add', date: selectedDate }, event.currentTarget)} disabled={notesLoading}>Add note</button></div>
      {notesLoading && <p role="status">Loading notes…</p>}
      {notesError && <Notice tone="error">{notesError} <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></Notice>}
      <div className="day-agenda-items">
        {selectedItems.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} contact={contacts.find((contact) => contact.id === appointment.contactId)} onClick={() => onOpenAppointment(appointment)} onDelete={adminMode && onDeleteAppointment ? () => onDeleteAppointment(appointment) : undefined} compact showDate={false} />)}
        {selectedNotes.map((note) => <article className="calendar-note" key={note.id} aria-label="Calendar note"><div className="calendar-note-header"><h3>Note</h3>{adminMode && <div className="calendar-note-actions"><button type="button" onClick={(event) => openNote({ type: 'edit', note }, event.currentTarget)}>Edit</button><button type="button" className="calendar-note-trash" aria-label="Delete note" onClick={(event) => openNote({ type: 'delete', note }, event.currentTarget)}><Icon name="trash" /></button></div>}</div><p>{note.content}</p></article>)}
        {!selectedItems.length && !selectedNotes.length && !notesLoading && !notesError && <EmptyState title="Nothing scheduled" text="There are no appointments or notes on this day." />}
      </div>
    </section>
    {noteDialog && noteDialog.type !== 'delete' && <Modal title={noteDialog.type === 'edit' ? 'Edit note' : 'Add note'} subtitle={formatLongDate(noteDialog.type === 'add' ? noteDialog.date : noteDialog.note.date)} onClose={closeNote} centered><CalendarNoteForm key={noteDialog.type === 'edit' ? noteDialog.note.id : 'new'} initialContent={noteDialog.type === 'edit' ? noteDialog.note.content : ''} busy={busy} onSave={saveNote} onCancel={closeNote} /></Modal>}
    {noteDialog?.type === 'delete' && <Modal title="Delete note?" onClose={closeNote} centered>{deleteError && <Notice tone="error">{deleteError}</Notice>}<p className="confirm-message">This note will be permanently deleted.</p><div className="form-actions"><button className="button secondary" type="button" onClick={closeNote} disabled={busy}>No</button><button className="button danger" type="button" onClick={() => void deleteNote()} disabled={busy}>{busy ? 'Deleting…' : 'Yes'}</button></div></Modal>}
    {message && <div className="toast" role="status">{message}</div>}
  </>
}
