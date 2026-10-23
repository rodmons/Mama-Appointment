import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bloodPressureService } from './bloodPressureService'

const { from, query } = vi.hoisted(() => {
  const builder = { select: vi.fn(), order: vi.fn(), range: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn() }
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
  query.update.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.range.mockResolvedValue({ data: [row], error: null })
})

describe('BP Supabase persistence', () => {
  it('loads and inserts database records without writing local storage or spoofing the author', async () => {
    expect(await bloodPressureService.load()).toEqual([{ ...draft, id: row.id, createdAt: row.created_at }])
    expect(from).toHaveBeenCalledWith('blood_pressure_readings')
    expect(query.order).toHaveBeenCalledWith('taken_at', { ascending: false })
    expect(query.range).toHaveBeenCalledWith(0, 499)
    await bloodPressureService.save(draft)
    expect(query.insert).toHaveBeenCalledWith({ taken_at: draft.takenAt, systolic: 123, diastolic: 81, pulse: 72, pill_timing: 'before' })
    expect(localStorage.length).toBe(0)
  })
  it.each(['42P01', 'PGRST205'])('explains the SQL needed for missing table error %s', async (code) => {
    query.range.mockResolvedValue({ data: null, error: { code } })
    await expect(bloodPressureService.load()).rejects.toThrow('20261023110000_blood_pressure.sql')
  })
  it('loads subsequent pages so an all-log average cannot silently omit older readings', async () => {
    const fullPage = Array.from({ length: 500 }, (_, index) => ({ ...row, id: `reading-${index}` }))
    query.range.mockResolvedValueOnce({ data: fullPage, error: null }).mockResolvedValueOnce({ data: [{ ...row, id: 'oldest' }], error: null })
    expect(await bloodPressureService.load()).toHaveLength(501)
    expect(query.range).toHaveBeenNthCalledWith(2, 500, 999)
  })
  it('updates only reading fields on the requested record and explains missing edit permissions', async () => {
    await bloodPressureService.save(draft, row.id)
    expect(query.update).toHaveBeenCalledWith({ taken_at: draft.takenAt, systolic: 123, diastolic: 81, pulse: 72, pill_timing: 'before' })
    expect(query.eq).toHaveBeenCalledWith('id', row.id)
    expect(query.insert).not.toHaveBeenCalled()
    query.single.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(bloodPressureService.save(draft, row.id)).rejects.toThrow('20261023120000_blood_pressure_editing.sql')
    expect(localStorage.length).toBe(0)
  })
  it('surfaces an access error without exposing database contents or falling back to local storage', async () => {
    query.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'Private contents' } })
    await expect(bloodPressureService.save(draft)).rejects.toThrow('check your connection and access')
    expect(localStorage.length).toBe(0)
  })
})
