import { demoAppointments, demoDoctors } from '../data/demoData'
import type { Appointment, AppointmentDraft, Doctor, DoctorDraft } from '../types'
import { supabase } from './supabase'

const APPOINTMENTS_KEY = 'mama-mona-appointments'
const DOCTORS_KEY = 'mama-mona-doctors'

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function mapDoctor(row: Record<string, unknown>): Doctor {
  return {
    id: String(row.id), name: String(row.name), specialty: String(row.specialty), hospital: String(row.hospital ?? ''),
    phone: String(row.phone ?? ''), notes: String(row.notes ?? ''), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id), date: String(row.date), startTime: String(row.start_time), endTime: String(row.end_time ?? ''),
    purpose: String(row.purpose), doctorId: String(row.doctor_id ?? ''), locationName: String(row.location_name ?? ''),
    address: String(row.address ?? ''), phone: String(row.phone ?? ''), mapsUrl: String(row.maps_url ?? ''), notes: String(row.notes ?? ''),
    thingsToBring: Array.isArray(row.things_to_bring) ? row.things_to_bring.map(String) : [], status: row.status as Appointment['status'],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function appointmentRow(item: AppointmentDraft) {
  return {
    date: item.date, start_time: item.startTime, end_time: item.endTime || null, purpose: item.purpose,
    doctor_id: item.doctorId || null, location_name: item.locationName || null, address: item.address || null,
    phone: item.phone || null, maps_url: item.mapsUrl || null, notes: item.notes || null,
    things_to_bring: item.thingsToBring, status: item.status,
  }
}

function doctorRow(item: DoctorDraft) {
  return { name: item.name, specialty: item.specialty, hospital: item.hospital || null, phone: item.phone || null, notes: item.notes || null }
}

export const dataService = {
  async load(): Promise<{ appointments: Appointment[]; doctors: Doctor[] }> {
    if (!supabase) {
      return { appointments: readLocal(APPOINTMENTS_KEY, demoAppointments), doctors: readLocal(DOCTORS_KEY, demoDoctors) }
    }
    const [appointmentsResult, doctorsResult] = await Promise.all([
      supabase.from('appointments').select('*').order('date').order('start_time'),
      supabase.from('doctors').select('*').order('name'),
    ])
    if (appointmentsResult.error) throw appointmentsResult.error
    if (doctorsResult.error) throw doctorsResult.error
    return { appointments: appointmentsResult.data.map(mapAppointment), doctors: doctorsResult.data.map(mapDoctor) }
  },

  async saveAppointment(draft: AppointmentDraft, id?: string): Promise<Appointment> {
    if (!supabase) {
      const items = readLocal<Appointment[]>(APPOINTMENTS_KEY, demoAppointments)
      const now = new Date().toISOString()
      const existing = id ? items.find((item) => item.id === id) : undefined
      const saved: Appointment = { ...draft, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
      writeLocal(APPOINTMENTS_KEY, existing ? items.map((item) => item.id === id ? saved : item) : [...items, saved])
      return saved
    }
    const query = id
      ? supabase.from('appointments').update(appointmentRow(draft)).eq('id', id)
      : supabase.from('appointments').insert(appointmentRow(draft))
    const { data, error } = await query.select().single()
    if (error) throw error
    return mapAppointment(data)
  },

  async deleteAppointment(id: string): Promise<void> {
    if (!supabase) {
      writeLocal(APPOINTMENTS_KEY, readLocal<Appointment[]>(APPOINTMENTS_KEY, demoAppointments).filter((item) => item.id !== id))
      return
    }
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) throw error
  },

  async saveDoctor(draft: DoctorDraft, id?: string): Promise<Doctor> {
    if (!supabase) {
      const items = readLocal<Doctor[]>(DOCTORS_KEY, demoDoctors)
      const now = new Date().toISOString()
      const existing = id ? items.find((item) => item.id === id) : undefined
      const saved: Doctor = { ...draft, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
      writeLocal(DOCTORS_KEY, existing ? items.map((item) => item.id === id ? saved : item) : [...items, saved])
      return saved
    }
    const query = id ? supabase.from('doctors').update(doctorRow(draft)).eq('id', id) : supabase.from('doctors').insert(doctorRow(draft))
    const { data, error } = await query.select().single()
    if (error) throw error
    return mapDoctor(data)
  },

  resetDemo(): void {
    localStorage.removeItem(APPOINTMENTS_KEY)
    localStorage.removeItem(DOCTORS_KEY)
  },
}
