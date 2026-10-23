import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bloodPressureService } from './bloodPressureService'

const { from, query } = vi.hoisted(() => {
  const builder = { select: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn() }
  return { query: builder, from: vi.fn(() => builder) }
})
vi.mock('./supabase', () => ({ supabase: { from } }))
const draft = { takenAt: '2026-10-23T17:00:00Z', systolic: 123, diastolic: 81, pulse: 72, pillTiming: 'before' as const }
const row = { id: 'reading-id', taken_at: draft.takenAt, systolic: 123, diastolic: 81, pulse: 72, pill_timing: 'before', created_at: '2026-10-23T18:00:00Z' }
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  query.select.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.order.mockResolvedValue({ data: [row], error: null })
})

describe('BP Supabase persistence', () => {
  it('loads and inserts database records without writing local storage or spoofing the author', async () => {
    expect(await bloodPressureService.load()).toEqual([{ ...draft, id: row.id, createdAt: row.created_at }])
    expect(from).toHaveBeenCalledWith('blood_pressure_readings')
    expect(query.order).toHaveBeenCalledWith('taken_at', { ascending: false })
    await bloodPressureService.save(draft)
    expect(query.insert).toHaveBeenCalledWith({ taken_at: draft.takenAt, systolic: 123, diastolic: 81, pulse: 72, pill_timing: 'before' })
    expect(localStorage.length).toBe(0)
  })
  it.each(['42P01', 'PGRST205'])('explains the SQL needed for missing table error %s', async (code) => {
    query.order.mockResolvedValue({ data: null, error: { code } })
    await expect(bloodPressureService.load()).rejects.toThrow('20261023110000_blood_pressure.sql')
  })
  it('surfaces an access error without exposing database contents or falling back to local storage', async () => {
    query.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'Private contents' } })
    await expect(bloodPressureService.save(draft)).rejects.toThrow('check your connection and access')
    expect(localStorage.length).toBe(0)
  })
})
