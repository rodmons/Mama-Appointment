import type { BloodPressureDraft, BloodPressureReading } from '../types'
import { supabase } from './supabase'

const STORAGE_KEY = 'mama-mona-blood-pressure'

function checkError(error: { code?: string } | null, action: 'loaded' | 'saved' | 'updated') {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205') {
    throw new Error('BP needs a database update. Run supabase/migrations/20261023110000_blood_pressure.sql in Supabase SQL Editor, then try again.')
  }
  if (action === 'updated' && error.code === '42501') {
    throw new Error('BP editing needs the latest database permissions. Run supabase/migrations/20261023120000_blood_pressure_editing.sql in Supabase SQL Editor if it has not been applied, then check your account access and try again.')
  }
  throw new Error(`Blood pressure readings could not be ${action}. Please check your connection and access, then try again.`)
}

function readLocal(): BloodPressureReading[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  try {
    const items: unknown = saved ? JSON.parse(saved) : []
    if (!Array.isArray(items)) throw new Error('Invalid records')
    return items as BloodPressureReading[]
  } catch { throw new Error('BP records on this device could not be read. Your stored records have been kept.') }
}

function mapReading(row: Record<string, unknown>): BloodPressureReading {
  return {
    id: String(row.id), takenAt: String(row.taken_at), systolic: Number(row.systolic),
    diastolic: Number(row.diastolic), pulse: Number(row.pulse),
    pillTiming: row.pill_timing as BloodPressureReading['pillTiming'], createdAt: String(row.created_at),
  }
}

export function newestReadingsFirst(items: BloodPressureReading[]): BloodPressureReading[] {
  // oxlint-disable-next-line unicorn/no-array-sort -- Sort a copy for ES2022 browser support.
  return [...items].sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
}

export const bloodPressureService = {
  async load(): Promise<BloodPressureReading[]> {
    if (!supabase) return newestReadingsFirst(readLocal())
    // Fetch every page so averages include all logs, beyond Supabase's row limit.
    const readings: BloodPressureReading[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('blood_pressure_readings').select('*')
        .order('taken_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + pageSize - 1)
      checkError(error, 'loaded')
      readings.push(...(data ?? []).map(mapReading))
      if ((data?.length ?? 0) < pageSize) return newestReadingsFirst(readings)
    }
  },
  async save(draft: BloodPressureDraft, id?: string): Promise<BloodPressureReading> {
    if (!Number.isFinite(Date.parse(draft.takenAt)) || !['before', 'after'].includes(draft.pillTiming)
      || [draft.systolic, draft.diastolic, draft.pulse].some((value) => !Number.isInteger(value) || value < 1 || value > 999)) {
      throw new Error('Enter a date and time, whole numbers from 1 to 999, and before or after pills.')
    }
    if (!supabase) {
      const items = readLocal()
      const existing = items.find((item) => item.id === id)
      if (id && !existing) throw new Error('This BP reading is no longer available. Close the form and refresh BP.')
      const saved = { ...draft, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]))
      return saved
    }
    const row = {
      taken_at: draft.takenAt, systolic: draft.systolic, diastolic: draft.diastolic,
      pulse: draft.pulse, pill_timing: draft.pillTiming,
    }
    const query = id ? supabase.from('blood_pressure_readings').update(row).eq('id', id) : supabase.from('blood_pressure_readings').insert(row)
    const { data, error } = await query.select().single()
    checkError(error, id ? 'updated' : 'saved')
    return mapReading(data)
  },
}
