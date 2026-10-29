import type { CalendarNote, CalendarNoteDraft } from '../types'
import { parseLocalDate, toDateInputValue } from '../utils/date'
import { supabase } from './supabase'

const STORAGE_KEY = 'mama-mona-calendar-notes'

function checkError(error: { code?: string } | null, action: 'loaded' | 'saved' | 'updated' | 'deleted') {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205') {
    throw new Error('Calendar notes need a database update. Run supabase/migrations/20261028090000_calendar_notes.sql in Supabase SQL Editor, then try again.')
  }
  if (['updated', 'deleted'].includes(action) && ['42501', 'PGRST116'].includes(error.code ?? '')) {
    throw new Error('This note could not be changed. Run supabase/migrations/20261028100000_calendar_note_editing.sql in Supabase SQL Editor if it has not been applied, then refresh the calendar and check your admin access.')
  }
  throw new Error(`Calendar notes could not be ${action}. Please check your connection and access, then try again.`)
}

function readLocal(): CalendarNote[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  try {
    const items: unknown = saved ? JSON.parse(saved) : []
    if (!Array.isArray(items)) throw new Error('Invalid notes')
    return items as CalendarNote[]
  } catch { throw new Error('Notes on this device could not be read. Your stored notes have been kept.') }
}

function mapNote(row: Record<string, unknown>): CalendarNote {
  return { id: String(row.id), date: String(row.note_date), content: String(row.content), createdAt: String(row.created_at) }
}

export const calendarNoteService = {
  async load(): Promise<CalendarNote[]> {
    if (!supabase) return readLocal()
    const notes: CalendarNote[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('calendar_notes').select('*')
        .order('note_date').order('created_at').order('id').range(offset, offset + pageSize - 1)
      checkError(error, 'loaded')
      notes.push(...(data ?? []).map(mapNote))
      if ((data?.length ?? 0) < pageSize) return notes
    }
  },
  async save(draft: CalendarNoteDraft, id?: string): Promise<CalendarNote> {
    const date = parseLocalDate(draft.date)
    const content = draft.content.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(date.getTime()) || toDateInputValue(date) !== draft.date || !content) {
      throw new Error('Choose a valid date and write a note before saving.')
    }
    if (!supabase) {
      const items = readLocal()
      const existing = items.find((item) => item.id === id)
      if (id && !existing) throw new Error('This note is no longer available. Close the form and refresh the calendar.')
      const saved = existing ? { ...existing, content } : { date: draft.date, content, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]))
      return saved
    }
    const query = id ? supabase.from('calendar_notes').update({ content }).eq('id', id) : supabase.from('calendar_notes').insert({ note_date: draft.date, content })
    const { data, error } = await query.select().single()
    checkError(error, id ? 'updated' : 'saved')
    return mapNote(data)
  },
  async delete(id: string): Promise<void> {
    if (!supabase) {
      const items = readLocal()
      if (!items.some((item) => item.id === id)) throw new Error('This note is no longer available. Close the confirmation and refresh the calendar.')
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.filter((item) => item.id !== id)))
      return
    }
    // Returning one row also catches RLS filtering the delete to zero rows.
    const { error } = await supabase.from('calendar_notes').delete().eq('id', id).select('id').single()
    checkError(error, 'deleted')
  },
}
