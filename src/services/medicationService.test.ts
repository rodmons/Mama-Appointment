import { beforeEach, describe, expect, it, vi } from 'vitest'
import { medicationService } from './medicationService'
import type { MedicationDraft } from '../types'

const { from, query } = vi.hoisted(() => {
  const builder = { select: vi.fn(), order: vi.fn(), update: vi.fn(), insert: vi.fn(), delete: vi.fn(), eq: vi.fn(), single: vi.fn() }
  return { query: builder, from: vi.fn(() => builder) }
})
vi.mock('./supabase', () => ({ supabase: { from } }))
const draft: MedicationDraft = { name: 'Recorded name', status: 'on_hold', medicationForm: 'Tablet', startDate: '2026-10-23', dosage: 'Recorded dosage', frequency: '', reason: '', providerId: 'provider-id', prescribingDoctor: 'Recorded doctor', notes: 'Keep notes' }
const row = { id: 'med-id', name: draft.name, status: draft.status, medication_form: draft.medicationForm, start_date: draft.startDate, dosage: draft.dosage, frequency: null, reason: null, provider_id: draft.providerId, prescribing_doctor: draft.prescribingDoctor, notes: draft.notes, created_at: 'created', updated_at: 'updated' }
beforeEach(() => {
  vi.clearAllMocks()
  for (const method of ['select', 'update', 'insert', 'delete', 'eq'] as const) query[method].mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.order.mockResolvedValue({ data: [row], error: null })
})
describe('medication Supabase persistence', () => {
  it('loads database fields and preserves optional blanks', async () => {
    expect(await medicationService.load()).toEqual([{ ...draft, id: row.id, createdAt: 'created', updatedAt: 'updated' }])
    expect(from).toHaveBeenCalledWith('medications')
  })
  it('inserts and updates the requested record with nullable optional values', async () => {
    await medicationService.save(draft)
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ provider_id: draft.providerId, prescribing_doctor: draft.prescribingDoctor, frequency: null, reason: null }))
    await medicationService.save(draft, row.id)
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'on_hold', dosage: draft.dosage, notes: draft.notes }))
    expect(query.eq).toHaveBeenCalledWith('id', row.id)
  })
  it('checks that the requested deletion returned a deleted row', async () => {
    await medicationService.delete(row.id)
    expect(query.delete).toHaveBeenCalledOnce()
    expect(query.eq).toHaveBeenCalledWith('id', row.id)
    expect(query.select).toHaveBeenCalledWith('id')
    query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    await expect(medicationService.delete(row.id)).rejects.toThrow('could not be deleted')
  })
  it.each(['42P01', 'PGRST205'])('explains the required SQL migration for %s', async (code) => {
    query.order.mockResolvedValue({ data: null, error: { code } })
    await expect(medicationService.load()).rejects.toThrow('20261023100000_medications.sql')
  })
  it('does not leak database errors or medical details in error messages', async () => {
    query.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'Private medication record contents' } })
    await expect(medicationService.save(draft)).rejects.toThrow('check your connection and access')
  })
})
