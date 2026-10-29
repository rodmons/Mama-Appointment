import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { calendarNoteService } from './services/calendarNoteService'
import { dataService } from './services/dataService'
import type { Appointment } from './types'

const appointment: Appointment = { id: 'echo', date: '2026-10-29', startTime: '09:30', endTime: '', purpose: 'Echocardiogram', contactId: '', locationName: '', address: '', phone: '', mapsUrl: '', notes: '', thingsToBring: [], status: 'confirmed', createdAt: '', updatedAt: '' }
vi.mock('./services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'mom-id', email: 'mom@example.com' } } } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } },
}))
vi.mock('./services/dataService', () => ({ dataService: {
  getAccessRole: vi.fn().mockResolvedValue('viewer'),
  load: vi.fn(async () => ({ appointments: [appointment], contacts: [] })),
} }))
vi.mock('./services/calendarNoteService', () => ({ calendarNoteService: { load: vi.fn(), save: vi.fn(), delete: vi.fn() } }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 9))
  vi.clearAllMocks()
  window.scrollTo = vi.fn()
  vi.mocked(dataService.getAccessRole).mockResolvedValue('viewer')
  vi.mocked(calendarNoteService.load).mockResolvedValue([])
  vi.mocked(calendarNoteService.save).mockImplementation(async (draft, id) => ({ ...draft, id: id ?? 'new-note', createdAt: '2026-10-28T17:00:00Z' }))
  vi.mocked(calendarNoteService.delete).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.useRealTimers() })

async function openCalendar() {
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Calendar' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add note' })).toBeEnabled())
}

it('lets a signed-in Mom viewer save a selected-day note below its appointment', async () => {
  await openCalendar()
  expect(screen.queryByRole('switch', { name: 'Admin Mode' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Thursday, October 29, 2026/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  expect(screen.getByRole('dialog', { name: 'Add note' })).toHaveTextContent('Thursday, October 29, 2026')
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Bring paperwork\nAsk about results.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const note = await screen.findByRole('article', { name: 'Calendar note' })
  expect(calendarNoteService.save).toHaveBeenCalledWith({ date: '2026-10-29', content: 'Bring paperwork\nAsk about results.' })
  expect(note).toHaveTextContent('Bring paperwork')
  const agenda = screen.getByRole('region', { name: 'Selected day' })
  expect(agenda.querySelector('.day-agenda-items')?.lastElementChild).toBe(note)
  expect(within(agenda).getByText('Echocardiogram')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Thursday, October 29, 2026, 1 appointment, 1 note/ }).querySelector('.calendar-note-dot')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Delete Echocardiogram/ })).not.toBeInTheDocument()
})

it('shows notes alone on an appointment-free day and markers on past, today, and upcoming dates', async () => {
  vi.mocked(calendarNoteService.load).mockResolvedValue(['2026-10-20', '2026-10-28', '2026-10-29', '2026-10-30'].map((date) => ({ id: date, date, content: `Note for ${date}`, createdAt: '' })))
  await openCalendar()
  const agenda = screen.getByRole('region', { name: 'Selected day' })
  expect(within(agenda).getByText('Note for 2026-10-28')).toBeInTheDocument()
  expect(within(agenda).queryByText('Nothing scheduled')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete note' })).not.toBeInTheDocument()
  expect(document.querySelectorAll('.calendar-note-dot')).toHaveLength(4)
  fireEvent.click(screen.getByRole('button', { name: /Tuesday, October 20, 2026/ }))
  expect(within(agenda).getByText('Note for 2026-10-20')).toBeInTheDocument()
  expect(within(agenda).queryByText('Note for 2026-10-28')).not.toBeInTheDocument()
})

it('keeps blank and cancelled notes unsaved and restores focus to Add note', async () => {
  await openCalendar()
  const add = screen.getByRole('button', { name: 'Add note' })
  add.focus(); fireEvent.click(add)
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: '  \n  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Write a note before saving.')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(calendarNoteService.save).not.toHaveBeenCalled()
  expect(add).toHaveFocus()
  fireEvent.click(add)
  expect(screen.getByLabelText('Note')).toHaveValue('')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('keeps entered text after a save failure and allows retrying', async () => {
  await openCalendar()
  vi.mocked(calendarNoteService.save).mockRejectedValueOnce(new Error('Please check your connection and access.'))
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Keep this note' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Please check your connection and access.')
  expect(screen.getByLabelText('Note')).toHaveValue('Keep this note')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('article')).toHaveTextContent('Keep this note')
})

it('keeps appointments available when notes cannot load and offers a retry', async () => {
  vi.mocked(calendarNoteService.load).mockRejectedValueOnce(new Error('Run 20261028090000_calendar_notes.sql in Supabase SQL Editor.'))
  await openCalendar()
  fireEvent.click(screen.getByRole('button', { name: /Thursday, October 29, 2026/ }))
  expect(screen.getByText('Echocardiogram')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('20261028090000_calendar_notes.sql')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(calendarNoteService.load).toHaveBeenCalledTimes(2)
})

const existingNote = { id: 'note-1', date: '2026-10-28', content: 'Original note\nSecond line', createdAt: '2026-10-28T17:00:00Z' }

it('shows controls on each note only in Admin Mode and edits the selected note with retry support', async () => {
  vi.mocked(dataService.getAccessRole).mockResolvedValue('admin')
  vi.mocked(calendarNoteService.load).mockResolvedValue([existingNote, { ...existingNote, id: 'note-2', content: 'Another note' }])
  await openCalendar()
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
  expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: 'Delete note' })).toHaveLength(2)
  const second = screen.getAllByRole('article')[1]
  const edit = within(second).getByRole('button', { name: 'Edit' })
  fireEvent.click(edit)
  expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeInTheDocument()
  expect(screen.getByLabelText('Note')).toHaveValue('Another note')
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Unsaved edit' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(calendarNoteService.save).not.toHaveBeenCalled()
  expect(edit).toHaveFocus()
  fireEvent.click(edit)
  expect(screen.getByLabelText('Note')).toHaveValue('Another note')
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Updated note\nKeep both lines' } })
  vi.mocked(calendarNoteService.save).mockRejectedValueOnce(new Error('Update failed. Please try again.'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Update failed')
  expect(screen.getByLabelText('Note')).toHaveValue('Updated note\nKeep both lines')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(calendarNoteService.save).toHaveBeenLastCalledWith({ date: existingNote.date, content: 'Updated note\nKeep both lines' }, 'note-2')
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.getAllByRole('article')[0]).toHaveTextContent('Original note')
  expect(screen.getAllByRole('article')[1]).toHaveTextContent('Updated note')
  fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete note' })).not.toBeInTheDocument()
})

it('deletes only after Yes, preserves notes after a failed delete, and removes the last marker after success', async () => {
  vi.mocked(dataService.getAccessRole).mockResolvedValue('admin')
  vi.mocked(calendarNoteService.load).mockResolvedValue([existingNote])
  await openCalendar()
  fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete note' }))
  expect(screen.getByRole('dialog', { name: 'Delete note?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'No' }))
  expect(calendarNoteService.delete).not.toHaveBeenCalled()
  expect(screen.getByRole('article')).toHaveTextContent('Original note')
  fireEvent.click(screen.getByRole('button', { name: 'Delete note' }))
  vi.mocked(calendarNoteService.delete).mockRejectedValueOnce(new Error('Delete failed. Please try again.'))
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed')
  expect(screen.getByRole('article')).toBeInTheDocument()
  expect(document.querySelectorAll('.calendar-note-dot')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(calendarNoteService.delete).toHaveBeenLastCalledWith(existingNote.id)
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(document.querySelectorAll('.calendar-note-dot')).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Add note' })).toHaveFocus()
})

it('keeps a date marker when a second note remains after deleting the first', async () => {
  vi.mocked(dataService.getAccessRole).mockResolvedValue('admin')
  vi.mocked(calendarNoteService.load).mockResolvedValue([existingNote, { ...existingNote, id: 'note-2', content: 'Keep this note' }])
  await openCalendar()
  fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete note' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByRole('article')).toHaveTextContent('Keep this note')
  expect(document.querySelectorAll('.calendar-note-dot')).toHaveLength(1)
})
