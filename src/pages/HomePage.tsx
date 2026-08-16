import type { Appointment, Doctor } from '../types'
import { formatTime, greeting, isUpcoming, parseLocalDate, relativeDate, sortAppointments } from '../utils/date'
import { AppointmentCard } from '../components/AppointmentCard'
import { EmptyState, PageIntro } from '../components/Layout'
import { Icon } from '../components/Icon'

export function HomePage({ appointments, doctors, onOpen }: { appointments: Appointment[]; doctors: Doctor[]; onOpen: (appointment: Appointment) => void }) {
  const upcoming = sortAppointments(appointments.filter((item) => isUpcoming(item)))
  const next = upcoming[0]
  const later = upcoming.slice(1)
  const past = sortAppointments(appointments.filter((item) => !isUpcoming(item))).reverse()
  const nextDoctor = next ? doctors.find((doctor) => doctor.id === next.doctorId) : undefined

  return <div className="home-page">
    <PageIntro eyebrow={new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())} title={greeting()} text="Here’s what’s coming up." />
    {next ? <button className="next-card" type="button" onClick={() => onOpen(next)}>
      <span className="eyebrow light">Your next appointment</span>
      <span className="next-date"><strong>{new Intl.DateTimeFormat('en-CA', { weekday: 'long' }).format(parseLocalDate(next.date))}</strong><span>{new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric' }).format(parseLocalDate(next.date))}</span></span>
      <span className="next-time">{formatTime(next.startTime)}</span>
      <span className="next-purpose">{next.purpose}</span>
      {nextDoctor && <span className="next-meta"><Icon name="user" />{nextDoctor.name} · {nextDoctor.specialty}</span>}
      {next.locationName && <span className="next-meta"><Icon name="pin" />{next.locationName}</span>}
      <span className="next-footer"><strong>{relativeDate(next.date)}</strong><span>View details <Icon name="next" /></span></span>
    </button> : <EmptyState title="No upcoming appointments" text="There’s nothing you need to prepare for right now." />}
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow">Plan ahead</p><h2>Upcoming</h2></div><span>{later.length}</span></div>{later.length ? <div className="card-stack">{later.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} doctor={doctors.find((doctor) => doctor.id === appointment.doctorId)} onClick={() => onOpen(appointment)} />)}</div> : <p className="quiet-text">No other appointments scheduled.</p>}</section>
    {past.length > 0 && <details className="history-section"><summary>Past appointments <span>{past.length}</span></summary><div className="card-stack muted">{past.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} doctor={doctors.find((doctor) => doctor.id === appointment.doctorId)} onClick={() => onOpen(appointment)} compact />)}</div></details>}
  </div>
}
