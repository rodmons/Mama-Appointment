import type { Appointment, Contact } from '../types'
import { formatTime, greeting, isUpcoming, parseLocalDate, sortAppointments } from '../utils/date'
import { AppointmentCard, DeleteAppointmentButton } from '../components/AppointmentCard'
import { EmptyState, PageIntro } from '../components/Layout'
import { Icon } from '../components/Icon'

export function HomePage({ appointments, contacts, onOpen, adminMode = false, onDelete }: { appointments: Appointment[]; contacts: Contact[]; onOpen: (appointment: Appointment) => void; adminMode?: boolean; onDelete?: (appointment: Appointment) => void }) {
  const upcoming = sortAppointments(appointments.filter((item) => isUpcoming(item)))
  const next = upcoming[0]
  const later = upcoming.slice(1)
  const past = sortAppointments(appointments.filter((item) => !isUpcoming(item))).reverse()
  const nextContact = next ? contacts.find((contact) => contact.id === next.contactId) : undefined
  const deleteHandler = (appointment: Appointment) => adminMode && onDelete ? () => onDelete(appointment) : undefined
  const nextDeleteHandler = next ? deleteHandler(next) : undefined

  return <div className="home-page">
    <PageIntro eyebrow={new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())} title={greeting()} />
    {next ? <div className="next-card-shell"><button className="next-card" type="button" onClick={() => onOpen(next)}>
      <span className="eyebrow light">Your next appointment</span><span className="next-date"><strong>{new Intl.DateTimeFormat('en-CA', { weekday: 'long' }).format(parseLocalDate(next.date))}</strong><span>{new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric' }).format(parseLocalDate(next.date))}</span></span>
      <span className="next-time">{formatTime(next.startTime)}</span><span className="next-purpose">{next.purpose}</span>
      <span className="next-meta"><Icon name="user" />{nextContact ? `${nextContact.name}${nextContact.roleOrSpecialty ? ` - ${nextContact.roleOrSpecialty}` : ''}` : 'Contact not available'}</span>
      <span className="next-meta"><Icon name="pin" />{nextContact?.organization || 'Not available'}</span>
      <span className="next-footer"><span>View details <Icon name="next" /></span></span>
    </button>{nextDeleteHandler && <DeleteAppointmentButton appointment={next} onDelete={nextDeleteHandler} />}</div> : <EmptyState title="No upcoming appointments" text="There’s nothing you need to prepare for right now." />}
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow">Plan ahead</p><h2>Upcoming</h2></div><span>{later.length}</span></div>{later.length ? <div className="card-stack">{later.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} contact={contacts.find((contact) => contact.id === appointment.contactId)} onClick={() => onOpen(appointment)} onDelete={deleteHandler(appointment)} />)}</div> : <p className="quiet-text">No other appointments scheduled.</p>}</section>
    {past.length > 0 && <details className="history-section"><summary>Past appointments <span>{past.length}</span></summary><div className="card-stack muted">{past.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} contact={contacts.find((contact) => contact.id === appointment.contactId)} onClick={() => onOpen(appointment)} onDelete={deleteHandler(appointment)} compact />)}</div></details>}
  </div>
}
