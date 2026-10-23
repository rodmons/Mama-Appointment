export type AppointmentStatus = 'confirmed' | 'tentative' | 'cancelled' | 'completed'
export type ContactType = 'doctor' | 'nurse' | 'clinic' | 'hospital' | 'pharmacy' | 'personal' | 'transportation' | 'other'
export type AppRole = 'viewer' | 'admin'

export interface Contact {
  id: string
  name: string
  contactType: ContactType
  roleOrSpecialty: string
  organization: string
  mapsUrl: string
  phone: string
  extension: string
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

export type AppView = 'home' | 'calendar' | 'contacts' | 'meds' | 'settings' | 'details'
export type AppointmentDraft = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
export type ContactDraft = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>

export type MedicationStatus = 'active' | 'on_hold' | 'completed' | 'discontinued'
export interface Medication {
  id: string
  name: string
  status: MedicationStatus
  medicationForm: string
  startDate: string
  dosage: string
  frequency: string
  reason: string
  providerId: string
  prescribingDoctor: string
  notes: string
  createdAt: string
  updatedAt: string
}
export type MedicationDraft = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>
