import type { Appointment, Contact } from '../types'
import { formatLongDate, formatTime, relativeDate } from '../utils/date'
import { Icon } from './Icon'

export function AppointmentCard({ appointment, contact, onClick, onDelete, compact = false, showDate = true }: { appointment: Appointment; contact?: Contact; onClick: () => void; onDelete?: () => void; compact?: boolean; showDate?: boolean }) {
  return <div className={`appointment-card-shell ${onDelete ? 'has-delete' : ''}`}>
    <button className={`appointment-card ${compact ? 'compact' : ''} ${showDate ? '' : 'without-date'} status-${appointment.status}`} type="button" onClick={onClick}>
      {showDate && <span className="date-tile"><small>{new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(new Date(`${appointment.date}T00:00:00`))}</small><strong>{appointment.date.slice(-2).replace(/^0/, '')}</strong></span>}
      <span className="appointment-summary">
        <span className="card-topline"><span className={`status-dot ${appointment.status}`} />{relativeDate(appointment.date)}</span>
        <strong>{appointment.purpose}</strong>
        <span><Icon name="clock" />{formatTime(appointment.startTime)}{contact ? ` · ${contact.name}` : ''}</span>
        {appointment.locationName && <span><Icon name="pin" />{appointment.locationName}</span>}
      </span>
      <Icon name="next" className="card-chevron" /><span className="sr-only">{formatLongDate(appointment.date)} details</span>
    </button>
    {onDelete && <DeleteAppointmentButton appointment={appointment} onDelete={onDelete} />}
  </div>
}

export function DeleteAppointmentButton({ appointment, onDelete }: { appointment: Appointment; onDelete: () => void }) {
  return <button className="appointment-delete-button" type="button" aria-label={`Delete ${appointment.purpose}`} onClick={onDelete}><Icon name="close" /></button>
}
