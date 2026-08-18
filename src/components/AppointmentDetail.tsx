import type { Appointment, Contact } from '../types'
import { formatLongDate, formatTimeRange, parseLocalDate } from '../utils/date'
import { Icon } from './Icon'

export function AppointmentDetail({ appointment, contact, adminMode, onBack, onEdit, onCancel, onDelete }: { appointment: Appointment; contact?: Contact; adminMode: boolean; onBack: () => void; onEdit: () => void; onCancel: () => void; onDelete: () => void }) {
  const mapsHref = appointment.mapsUrl || (appointment.address ? `https://maps.google.com/?q=${encodeURIComponent(appointment.address)}` : '')
  const phone = appointment.phone || contact?.phone || ''
  const organization = contact?.organization || 'Not available'
  const contactSummary = contact ? `${contact.name}${contact.roleOrSpecialty ? ` - ${contact.roleOrSpecialty}` : ''}` : 'Contact not available'
  const shortDate = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(parseLocalDate(appointment.date)).toUpperCase()

  return <article className="detail-page">
    <button className="back-button" type="button" onClick={onBack}><Icon name="back" />Back</button>
    <section className="detail-hero">
      <span className={`status-pill ${appointment.status}`}>{appointment.status}</span><p className="detail-short-date">{shortDate}</p>
      <h1>{appointment.purpose}</h1><p className="detail-date">{formatLongDate(appointment.date)}</p><p className="detail-time">{formatTimeRange(appointment.startTime, appointment.endTime)}</p>
      <div className="detail-hero-contact"><p><Icon name="user" />{contactSummary}</p><p><Icon name="pin" />{organization}</p></div>
    </section>
    <section className="detail-card">
      <div className="detail-row"><span className="detail-icon"><Icon name="user" /></span><div><small>Primary contact</small><strong>{contactSummary}</strong><p className="detail-contact-organization"><Icon name="pin" />{organization}</p>{phone && <a className="button secondary detail-call-button" href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" />Call</a>}</div></div>
      {appointment.address && <div className="detail-row"><span className="detail-icon"><Icon name="pin" /></span><div><small>Address</small><strong>{appointment.address}</strong></div></div>}
      {mapsHref && <div className="detail-actions"><a className="button primary" href={mapsHref} target="_blank" rel="noreferrer"><Icon name="pin" />Open in Maps</a></div>}
    </section>
    {appointment.thingsToBring.length > 0 && <section className="detail-card"><div className="section-title"><span className="detail-icon warm"><Icon name="bag" /></span><h2>Things to bring</h2></div><ul className="bring-list">{appointment.thingsToBring.map((item) => <li key={item}><Icon name="check" />{item}</li>)}</ul></section>}
    {appointment.notes && <section className="detail-card"><p className="eyebrow">Good to know</p><h2>Notes</h2><p className="detail-notes">{appointment.notes}</p></section>}
    {adminMode && <section className="admin-actions" aria-label="Admin appointment actions">
      <button className="button secondary" type="button" onClick={onEdit}><Icon name="edit" />Edit</button>
      {appointment.status !== 'cancelled' && <button className="button secondary" type="button" onClick={onCancel}>Appointment Cancelled</button>}
      <button className="button danger" type="button" onClick={onDelete}><Icon name="trash" />Delete</button>
    </section>}
  </article>
}
