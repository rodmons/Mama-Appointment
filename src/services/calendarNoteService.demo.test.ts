import { beforeEach, expect, it, vi } from 'vitest'
import { calendarNoteService } from './calendarNoteService'
import { dataService } from './dataService'

vi.mock('./supabase', () => ({ supabase: null }))
beforeEach(() => localStorage.clear())

it('persists multiple demo notes across service reloads and clears them with Reset Demo', async () => {
  const first = await calendarNoteService.save({ date: '2026-10-29', content: 'First note\nSecond line' })
  const second = await calendarNoteService.save({ date: '2026-10-29', content: 'Another note' })
  expect(await calendarNoteService.load()).toEqual([first, second])
  expect(first.id).not.toBe(second.id)
  dataService.resetDemo()
  expect(await calendarNoteService.load()).toEqual([])
})

it('preserves unreadable local notes instead of overwriting them when saving', async () => {
  localStorage.setItem('mama-mona-calendar-notes', 'unreadable')
  await expect(calendarNoteService.save({ date: '2026-10-29', content: 'New note' })).rejects.toThrow('Your stored notes have been kept')
  expect(localStorage.getItem('mama-mona-calendar-notes')).toBe('unreadable')
})

it('persists edits and deletes for the selected demo note while retaining its original metadata', async () => {
  const first = await calendarNoteService.save({ date: '2026-10-29', content: 'First note' })
  const second = await calendarNoteService.save({ date: '2026-10-29', content: 'Keep this note' })
  const edited = await calendarNoteService.save({ date: '2026-10-30', content: 'Updated note' }, first.id)
  expect(edited).toEqual({ ...first, content: 'Updated note' })
  expect(await calendarNoteService.load()).toEqual([edited, second])
  await calendarNoteService.delete(first.id)
  expect(await calendarNoteService.load()).toEqual([second])
  await expect(calendarNoteService.delete(first.id)).rejects.toThrow('no longer available')
  await expect(calendarNoteService.save({ date: first.date, content: 'Recreate' }, first.id)).rejects.toThrow('no longer available')
  expect(await calendarNoteService.load()).toEqual([second])
})
