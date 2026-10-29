import { beforeEach, expect, it, vi } from 'vitest'
import { calendarNoteService } from './calendarNoteService'

const { from, query } = vi.hoisted(() => {
  const builder = { select: vi.fn(), order: vi.fn(), range: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn(), single: vi.fn() }
  return { query: builder, from: vi.fn(() => builder) }
})
vi.mock('./supabase', () => ({ supabase: { from } }))
const draft = { date: '2026-10-29', content: 'Bring paperwork\nAsk about results.' }
const row = { id: 'note-id', note_date: draft.date, content: draft.content, created_at: '2026-10-28T17:00:00Z' }
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear()
  query.select.mockReturnValue(query); query.order.mockReturnValue(query); query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query); query.delete.mockReturnValue(query); query.eq.mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.range.mockResolvedValue({ data: [row], error: null })
})

it('loads database notes and saves their literal date without accepting an author or timestamp', async () => {
  expect(await calendarNoteService.load()).toEqual([{ ...draft, id: row.id, createdAt: row.created_at }])
  await calendarNoteService.save({ ...draft, content: `  ${draft.content}  ` })
  expect(from).toHaveBeenCalledWith('calendar_notes')
  expect(query.insert).toHaveBeenCalledWith({ note_date: draft.date, content: draft.content })
  expect(localStorage.length).toBe(0)
})

it('loads notes beyond the database row limit so every calendar marker is available', async () => {
  query.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => ({ ...row, id: String(index) })), error: null }).mockResolvedValueOnce({ data: [row], error: null })
  expect(await calendarNoteService.load()).toHaveLength(501)
  expect(query.range).toHaveBeenNthCalledWith(2, 500, 999)
})

it.each(['42P01', 'PGRST205'])('explains missing notes SQL for %s', async (code) => {
  query.range.mockResolvedValue({ data: null, error: { code } })
  await expect(calendarNoteService.load()).rejects.toThrow('20261028090000_calendar_notes.sql')
})

it('surfaces access denial without copying notes to browser storage', async () => {
  query.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'Private server details' } })
  await expect(calendarNoteService.save(draft)).rejects.toThrow('check your connection and access')
  expect(localStorage.length).toBe(0)
})

it.each([{ date: '2026-02-30', content: 'Invalid date' }, { date: '2026-10-29', content: ' \n\t ' }])('rejects invalid dates and blank content before inserting', async (invalid) => {
  await expect(calendarNoteService.save(invalid)).rejects.toThrow('Choose a valid date and write a note')
  expect(query.insert).not.toHaveBeenCalled()
})

it('updates only note content on the selected record in Supabase', async () => {
  await calendarNoteService.save({ ...draft, content: 'Updated note' }, row.id)
  expect(query.update).toHaveBeenCalledWith({ content: 'Updated note' })
  expect(query.eq).toHaveBeenCalledWith('id', row.id)
  expect(query.insert).not.toHaveBeenCalled()
  expect(localStorage.length).toBe(0)
})

it('deletes only the selected database record and requests proof of the affected row', async () => {
  await calendarNoteService.delete(row.id)
  expect(query.delete).toHaveBeenCalledOnce()
  expect(query.eq).toHaveBeenCalledWith('id', row.id)
  expect(query.select).toHaveBeenCalledWith('id')
  expect(query.single).toHaveBeenCalledOnce()
  expect(localStorage.length).toBe(0)
})

it.each(['42501', 'PGRST116'])('does not report edit/delete success when access is denied or no row is affected (%s)', async (code) => {
  query.single.mockResolvedValue({ data: null, error: { code } })
  await expect(calendarNoteService.save(draft, row.id)).rejects.toThrow('20261028100000_calendar_note_editing.sql')
  await expect(calendarNoteService.delete(row.id)).rejects.toThrow('20261028100000_calendar_note_editing.sql')
  expect(localStorage.length).toBe(0)
})
