export type AppointmentStatus = 'confirmed' | 'tentative' | 'cancelled' | 'completed'

export interface Doctor {
  id: string
  name: string
  specialty: string
  hospital: string
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
  doctorId: string
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

export type AppView = 'home' | 'calendar' | 'doctors' | 'settings' | 'details'
export type AppointmentDraft = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
export type DoctorDraft = Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>
