import { demoAppointments, demoContacts } from '../data/demoData'
import type { AppRole, Appointment, AppointmentDraft, Contact, ContactDraft, ContactType } from '../types'
import { supabase } from './supabase'

const APPOINTMENTS_KEY = 'mama-mona-appointments'
const CONTACTS_KEY = 'mama-mona-contacts'
const LEGACY_DOCTORS_KEY = 'mama-mona-doctors'

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

function normalizeLocalContact(item: Record<string, unknown>): Contact {
  return {
    id: String(item.id),
    name: String(item.name),
    contactType: (item.contactType ?? (String(item.specialty ?? '').toLowerCase().includes('nurse') ? 'nurse' : 'doctor')) as ContactType,
    roleOrSpecialty: String(item.roleOrSpecialty ?? item.specialty ?? ''),
    organization: String(item.organization ?? item.hospital ?? ''),
    phone: String(item.phone ?? ''),
    notes: String(item.notes ?? ''),
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  }
}

function loadLocalContacts(): Contact[] {
  const current = readLocal<Record<string, unknown>[]>(CONTACTS_KEY, [])
  if (current.length) return current.map(normalizeLocalContact)
  const legacy = readLocal<Record<string, unknown>[]>(LEGACY_DOCTORS_KEY, [])
  return legacy.length ? legacy.map(normalizeLocalContact) : demoContacts
}

function normalizeLocalAppointment(item: Record<string, unknown>): Appointment {
  return {
    ...item,
    contactId: String(item.contactId ?? item.doctorId ?? ''),
  } as Appointment
}

function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    name: String(row.name),
    contactType: row.contact_type as ContactType,
    roleOrSpecialty: String(row.role_or_specialty ?? ''),
    organization: String(row.organization ?? ''),
    phone: String(row.phone ?? ''),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id), date: String(row.date), startTime: String(row.start_time), endTime: String(row.end_time ?? ''),
    purpose: String(row.purpose), contactId: String(row.contact_id ?? ''), locationName: String(row.location_name ?? ''),
    address: String(row.address ?? ''), phone: String(row.phone ?? ''), mapsUrl: String(row.maps_url ?? ''), notes: String(row.notes ?? ''),
    thingsToBring: Array.isArray(row.things_to_bring) ? row.things_to_bring.map(String) : [], status: row.status as Appointment['status'],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function appointmentRow(item: AppointmentDraft) {
  return {
    date: item.date, start_time: item.startTime, end_time: item.endTime || null, purpose: item.purpose,
    contact_id: item.contactId || null, location_name: item.locationName || null, address: item.address || null,
    phone: item.phone || null, maps_url: item.mapsUrl || null, notes: item.notes || null,
    things_to_bring: item.thingsToBring, status: item.status,
  }
}

function contactRow(item: ContactDraft) {
  return {
    name: item.name,
    contact_type: item.contactType,
    role_or_specialty: item.roleOrSpecialty || null,
    organization: item.organization || null,
    phone: item.phone || null,
    notes: item.notes || null,
  }
}

export const dataService = {
  async getAccessRole(userId: string): Promise<AppRole | null> {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('app_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data?.role === 'admin' || data?.role === 'viewer' ? data.role : null
  },

  async load(): Promise<{ appointments: Appointment[]; contacts: Contact[] }> {
    if (!supabase) {
      const appointments = readLocal<Record<string, unknown>[]>(APPOINTMENTS_KEY, demoAppointments as unknown as Record<string, unknown>[]).map(normalizeLocalAppointment)
      return { appointments, contacts: loadLocalContacts() }
    }
    const [appointmentsResult, contactsResult] = await Promise.all([
      supabase.from('appointments').select('*').order('date').order('start_time'),
      supabase.from('contacts').select('*').order('name'),
    ])
    if (appointmentsResult.error) throw appointmentsResult.error
    if (contactsResult.error) throw contactsResult.error
    return { appointments: appointmentsResult.data.map(mapAppointment), contacts: contactsResult.data.map(mapContact) }
  },

  async saveAppointment(draft: AppointmentDraft, id?: string): Promise<Appointment> {
    if (!supabase) {
      const items = readLocal<Record<string, unknown>[]>(APPOINTMENTS_KEY, demoAppointments as unknown as Record<string, unknown>[]).map(normalizeLocalAppointment)
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
      const items = readLocal<Record<string, unknown>[]>(APPOINTMENTS_KEY, demoAppointments as unknown as Record<string, unknown>[]).map(normalizeLocalAppointment)
      writeLocal(APPOINTMENTS_KEY, items.filter((item) => item.id !== id))
      return
    }
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) throw error
  },

  async saveContact(draft: ContactDraft, id?: string): Promise<Contact> {
    if (!supabase) {
      const items = loadLocalContacts()
      const now = new Date().toISOString()
      const existing = id ? items.find((item) => item.id === id) : undefined
      const saved: Contact = { ...draft, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
      writeLocal(CONTACTS_KEY, existing ? items.map((item) => item.id === id ? saved : item) : [...items, saved])
      return saved
    }
    const query = id ? supabase.from('contacts').update(contactRow(draft)).eq('id', id) : supabase.from('contacts').insert(contactRow(draft))
    const { data, error } = await query.select().single()
    if (error) throw error
    return mapContact(data)
  },

  resetDemo(): void {
    localStorage.removeItem(APPOINTMENTS_KEY)
    localStorage.removeItem(CONTACTS_KEY)
    localStorage.removeItem(LEGACY_DOCTORS_KEY)
  },
}
