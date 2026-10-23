import type { Medication, MedicationDraft } from '../types'
import { supabase } from './supabase'

const MEDICATIONS_KEY = 'mama-mona-medications'
const schemaMessage = 'MEDS needs a database update. Run supabase/migrations/20261023100000_medications.sql in Supabase SQL Editor, then try again.'

function checkError(error: { code?: string } | null, action: 'loaded' | 'saved' | 'deleted') {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205') throw new Error(schemaMessage)
  throw new Error(`Medication information could not be ${action}. Please check your connection and access, then try again.`)
}

function readLocal(): Medication[] {
  const saved = localStorage.getItem(MEDICATIONS_KEY)
  // Do not replace unreadable records with an empty list on the next save.
  try { return saved ? JSON.parse(saved) as Medication[] : [] }
  catch { throw new Error('Medication records on this device could not be read. Your stored records have been kept.') }
}

function mapMedication(row: Record<string, unknown>): Medication {
  return {
    id: String(row.id), name: String(row.name), status: row.status as Medication['status'],
    medicationForm: String(row.medication_form ?? ''), startDate: String(row.start_date ?? ''),
    dosage: String(row.dosage ?? ''), frequency: String(row.frequency ?? ''), reason: String(row.reason ?? ''),
    providerId: String(row.provider_id ?? ''), prescribingDoctor: String(row.prescribing_doctor ?? ''),
    notes: String(row.notes ?? ''), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function medicationRow(draft: MedicationDraft) {
  return {
    name: draft.name, status: draft.status, medication_form: draft.medicationForm || null,
    start_date: draft.startDate || null, dosage: draft.dosage || null, frequency: draft.frequency || null,
    reason: draft.reason || null, provider_id: draft.providerId || null,
    prescribing_doctor: draft.prescribingDoctor || null, notes: draft.notes || null,
  }
}

export const medicationService = {
  async load(): Promise<Medication[]> {
    if (!supabase) return readLocal()
    const { data, error } = await supabase.from('medications').select('*').order('name')
    checkError(error, 'loaded')
    return (data ?? []).map(mapMedication)
  },
  async save(draft: MedicationDraft, id?: string): Promise<Medication> {
    if (!supabase) {
      const items = readLocal()
      const existing = items.find((item) => item.id === id)
      if (id && !existing) throw new Error('This medication no longer exists. Close the form and refresh MEDS.')
      const now = new Date().toISOString()
      const saved = { ...draft, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
      localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]))
      return saved
    }
    const query = id ? supabase.from('medications').update(medicationRow(draft)).eq('id', id) : supabase.from('medications').insert(medicationRow(draft))
    const { data, error } = await query.select().single()
    checkError(error, 'saved')
    return mapMedication(data)
  },
  async delete(id: string): Promise<void> {
    if (!supabase) {
      localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(readLocal().filter((item) => item.id !== id)))
      return
    }
    const { data, error } = await supabase.from('medications').delete().eq('id', id).select('id').single()
    checkError(error, 'deleted')
    if (!data) throw new Error('The medication could not be deleted. Refresh MEDS and try again.')
  },
}
