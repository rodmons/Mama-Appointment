export type AppointmentStatus = 'confirmed' | 'tentative' | 'cancelled' | 'completed'
export type ContactType = 'doctor' | 'nurse' | 'clinic' | 'hospital' | 'pharmacy' | 'personal' | 'transportation' | 'other'
export type AppRole = 'viewer' | 'admin'

export interface Contact {
  id: string
  name: string
  contactType: ContactType
  roleOrSpecialty: string
  organization: string
  phone: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  contactId: string
  locationName: string
  address: string
  phone: string
  mapsUrl: string
  notes: string
  thingsToBring: string[]
  status: AppointmentStatus
  createdAt: string
  updatedAt: string
}

export type AppView = 'home' | 'calendar' | 'contacts' | 'settings' | 'details'
export type AppointmentDraft = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
export type ContactDraft = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
