import type { Appointment, Doctor } from '../types'

const createdAt = '2026-08-01T12:00:00.000Z'

export const demoDoctors: Doctor[] = [
  { id: 'doctor-lu', name: 'Dr. Lu', specialty: 'ENT / Otolaryngologist', hospital: "St. Paul's Hospital", phone: '604-555-0142', notes: '', createdAt, updatedAt: createdAt },
  { id: 'doctor-cho', name: 'Dr. Cho', specialty: 'Anesthesiologist', hospital: "St. Paul's Hospital", phone: '604-555-0168', notes: '', createdAt, updatedAt: createdAt },
  { id: 'doctor-hamilton', name: 'Dr. Hamilton', specialty: 'Radiation Oncologist', hospital: 'BC Cancer Vancouver', phone: '604-555-0191', notes: '', createdAt, updatedAt: createdAt },
  { id: 'doctor-harrison', name: 'Dr. Harrison', specialty: 'Oncology', hospital: 'BC Cancer Vancouver', phone: '604-555-0116', notes: '', createdAt, updatedAt: createdAt },
  { id: 'doctor-minette', name: 'Minette', specialty: 'Nurse Practitioner', hospital: 'Vancouver General Hospital', phone: '604-555-0184', notes: '', createdAt, updatedAt: createdAt },
]

export const demoAppointments: Appointment[] = [
  {
    id: 'appointment-audiogram', date: '2026-08-11', startTime: '10:30', endTime: '12:00', purpose: 'Audiogram', doctorId: 'doctor-lu',
    locationName: "St. Paul's Hospital", address: '1081 Burrard Street, Vancouver, BC', phone: '604-555-0142', mapsUrl: 'https://maps.google.com/?q=1081+Burrard+Street+Vancouver+BC',
    notes: 'Please arrive 20 minutes early to check in.', thingsToBring: ['Hearing aids', 'BC Services Card', 'Medication list'], status: 'confirmed', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-oncology', date: '2026-08-19', startTime: '13:15', endTime: '14:00', purpose: 'Oncology Follow-Up', doctorId: 'doctor-harrison',
    locationName: 'BC Cancer Vancouver', address: '600 West 10th Avenue, Vancouver, BC', phone: '604-555-0116', mapsUrl: '',
    notes: 'Write down any questions before the visit.', thingsToBring: ['BC Services Card', 'Question list'], status: 'confirmed', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-medication', date: '2026-09-04', startTime: '09:00', endTime: '', purpose: 'Medication Review', doctorId: 'doctor-minette',
    locationName: 'Vancouver General Hospital', address: '899 West 12th Avenue, Vancouver, BC', phone: '', mapsUrl: '',
    notes: '', thingsToBring: ['Current medications'], status: 'tentative', createdAt, updatedAt: createdAt,
  },
  {
    id: 'appointment-past', date: '2026-07-15', startTime: '11:00', endTime: '11:45', purpose: 'ENT Follow-Up', doctorId: 'doctor-lu',
    locationName: "St. Paul's Hospital", address: '1081 Burrard Street, Vancouver, BC', phone: '604-555-0142', mapsUrl: '',
    notes: '', thingsToBring: [], status: 'completed', createdAt, updatedAt: createdAt,
  },
]
