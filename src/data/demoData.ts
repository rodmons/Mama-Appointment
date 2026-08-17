import type { Appointment, Contact } from '../types'

const createdAt = '2026-08-01T12:00:00.000Z'

export const demoContacts: Contact[] = [
  { id: 'contact-lu', name: 'Dr. Lu', contactType: 'doctor', roleOrSpecialty: 'ENT / Otolaryngologist', organization: "St. Paul's Hospital", phone: '604-555-0142', notes: '', createdAt, updatedAt: createdAt },
  { id: 'contact-cho', name: 'Dr. Cho', contactType: 'doctor', roleOrSpecialty: 'Anesthesiologist', organization: "St. Paul's Hospital", phone: '604-555-0168', notes: '', createdAt, updatedAt: createdAt },
  { id: 'contact-hamilton', name: 'Dr. Hamilton', contactType: 'doctor', roleOrSpecialty: 'Radiation Oncologist', organization: 'BC Cancer Vancouver', phone: '604-555-0191', notes: '', createdAt, updatedAt: createdAt },
  { id: 'contact-harrison', name: 'Dr. Harrison', contactType: 'doctor', roleOrSpecialty: 'Oncology', organization: 'BC Cancer Vancouver', phone: '604-555-0116', notes: '', createdAt, updatedAt: createdAt },
  { id: 'contact-minette', name: 'Minette', contactType: 'nurse', roleOrSpecialty: 'Nurse Practitioner', organization: 'Vancouver General Hospital', phone: '604-555-0184', notes: '', createdAt, updatedAt: createdAt },
  { id: 'contact-bc-cancer', name: 'BC Cancer Main Reception', contactType: 'clinic', roleOrSpecialty: '', organization: 'BC Cancer Vancouver', phone: '604-877-6000', notes: 'General information line', createdAt, updatedAt: createdAt },
]

export const demoAppointments: Appointment[] = [
  {
    id: 'appointment-audiogram', date: '2026-08-11', startTime: '10:30', endTime: '12:00', purpose: 'Audiogram', contactId: 'contact-lu',
    locationName: "St. Paul's Hospital", address: '1081 Burrard Street, Vancouver, BC', phone: '604-555-0142', mapsUrl: 'https://maps.google.com/?q=1081+Burrard+Street+Vancouver+BC',
    notes: 'Please arrive 20 minutes early to check in.', thingsToBring: ['Hearing aids', 'BC Services Card', 'Medication list'], status: 'confirmed', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-oncology', date: '2026-08-19', startTime: '13:15', endTime: '14:00', purpose: 'Oncology Follow-Up', contactId: 'contact-harrison',
    locationName: 'BC Cancer Vancouver', address: '600 West 10th Avenue, Vancouver, BC', phone: '604-555-0116', mapsUrl: '',
    notes: 'Write down any questions before the visit.', thingsToBring: ['BC Services Card', 'Question list'], status: 'confirmed', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-medication', date: '2026-09-04', startTime: '09:00', endTime: '', purpose: 'Medication Review', contactId: 'contact-minette',
    locationName: 'Vancouver General Hospital', address: '899 West 12th Avenue, Vancouver, BC', phone: '', mapsUrl: '',
    notes: '', thingsToBring: ['Current medications'], status: 'tentative', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-past', date: '2026-07-15', startTime: '11:00', endTime: '11:45', purpose: 'ENT Follow-Up', contactId: 'contact-lu',
    locationName: "St. Paul's Hospital", address: '1081 Burrard Street, Vancouver, BC', phone: '604-555-0142', mapsUrl: '',
    notes: '', thingsToBring: [], status: 'completed', createdAt, updatedAt: createdAt,
  },
]
