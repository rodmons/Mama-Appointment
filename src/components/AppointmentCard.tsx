import type { Appointment, Contact } from '../types'
import { formatLongDate, formatTime, relativeDate } from '../utils/date'
import { Icon } from './Icon'
import { appointmentMapUrl } from '../utils/maps'

export function AppointmentCard({ appointment, contact, onClick, onDelete, compact = false, showDate = true }: { appointment: Appointment; contact?: Contact; onClick: () => void; onDelete?: () => void; compact?: boolean; showDate?: boolean }) {
  const mapsHref = appointmentMapUrl(appointment, contact)
  return <div className={`appointment-card-shell ${onDelete ? 'has-delete' : ''}`}>
    <div className={`appointment-card ${compact ? 'compact' : ''} ${showDate ? '' : 'without-date'} status-${appointment.status}`}>
      <button className="appointment-card-open" type="button" onClick={onClick} aria-label={`${appointment.purpose}, ${formatLongDate(appointment.date)} details`} />
      {showDate && <span className="date-tile"><small>{new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(new Date(`${appointment.date}T00:00:00`))}</small><strong>{appointment.date.slice(-2).replace(/^0/, '')}</strong></span>}
      <span className="appointment-summary">
        <span className="card-topline"><span className={`status-dot ${appointment.status}`} />{relativeDate(appointment.date)}</span>
        <strong>{appointment.purpose}</strong>
        <span><Icon name="clock" />{formatTime(appointment.startTime)}{contact ? ` · ${contact.name}` : ''}</span>
        {appointment.locationName && <span><Icon name="pin" />{mapsHref ? <a className="appointment-map-link" href={mapsHref} target="_blank" rel="noreferrer">{appointment.locationName}</a> : appointment.locationName}</span>}
      </span>
      <Icon name="next" className="card-chevron" />
    </div>
    {onDelete && <DeleteAppointmentButton appointment={appointment} onDelete={onDelete} />}
  </div>
}

export function DeleteAppointmentButton({ appointment, onDelete }: { appointment: Appointment; onDelete: () => void }) {
  return <button className="appointment-delete-button" type="button" aria-label={`Delete ${appointment.purpose}`} onClick={onDelete}><Icon name="close" /></button>
}
