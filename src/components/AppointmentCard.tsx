import type { Appointment, Doctor } from '../types'
import { formatLongDate, formatTime, relativeDate } from '../utils/date'
import { Icon } from './Icon'

export function AppointmentCard({ appointment, doctor, onClick, compact = false }: { appointment: Appointment; doctor?: Doctor; onClick: () => void; compact?: boolean }) {
  return (
    <button className={`appointment-card ${compact ? 'compact' : ''} status-${appointment.status}`} type="button" onClick={onClick}>
      <span className="date-tile">
        <small>{new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(new Date(`${appointment.date}T00:00:00`))}</small>
        <strong>{appointment.date.slice(-2).replace(/^0/, '')}</strong>
      </span>
      <span className="appointment-summary">
        <span className="card-topline"><span className={`status-dot ${appointment.status}`} />{relativeDate(appointment.date)}</span>
        <strong>{appointment.purpose}</strong>
        <span><Icon name="clock" />{formatTime(appointment.startTime)}{doctor ? ` · ${doctor.name}` : ''}</span>
        {appointment.locationName && <span><Icon name="pin" />{appointment.locationName}</span>}
      </span>
      <Icon name="next" className="card-chevron" />
      <span className="sr-only">{formatLongDate(appointment.date)} details</span>
    </button>
  )
}
