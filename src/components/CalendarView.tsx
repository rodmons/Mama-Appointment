import { useMemo, useState } from 'react'
import type { Appointment, Contact } from '../types'
import { formatLongDate, formatMonthYear, monthGrid, toDateInputValue } from '../utils/date'
import { AppointmentCard } from './AppointmentCard'
import { EmptyState } from './Layout'
import { Icon } from './Icon'

export function CalendarView({ appointments, contacts, selectedDate, onSelectDate, onOpenAppointment, adminMode = false, onDeleteAppointment }: { appointments: Appointment[]; contacts: Contact[]; selectedDate: string; onSelectDate: (date: string) => void; onOpenAppointment: (appointment: Appointment) => void; adminMode?: boolean; onDeleteAppointment?: (appointment: Appointment) => void }) {
  const selected = new Date(`${selectedDate}T00:00:00`)
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const days = useMemo(() => monthGrid(cursor), [cursor])
  const selectedItems = appointments.filter((item) => item.date === selectedDate)
  const today = toDateInputValue(new Date())

  function moveMonth(amount: number) { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)) }

  return <>
    <section className="calendar-card" aria-label="Monthly calendar">
      <div className="calendar-header"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><Icon name="back" /></button><h2>{formatMonthYear(cursor)}</h2><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><Icon name="next" /></button></div>
      <div className="weekday-row" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">{days.map(({ date, inMonth }) => {
        const value = toDateInputValue(date)
        const count = appointments.filter((item) => item.date === value).length
        const appointmentState = count ? value < today ? 'previous-appointment' : value > today ? 'upcoming-appointment' : '' : ''
        return <button key={value} className={`${inMonth ? '' : 'outside'} ${value === today ? 'today' : ''} ${value === selectedDate ? 'selected' : ''} ${appointmentState}`} type="button" onClick={() => onSelectDate(value)} aria-label={`${formatLongDate(value)}, ${count} appointment${count === 1 ? '' : 's'}`} aria-pressed={value === selectedDate}><span>{date.getDate()}</span></button>
      })}</div>
      <div className="calendar-legend" aria-label="Calendar legend"><span><i className="legend-swatch previous" />Previous</span><span><i className="legend-swatch today" />Today</span><span><i className="legend-swatch upcoming" />Upcoming</span></div>
    </section>
    <section className="day-agenda"><p className="eyebrow">Selected day</p><h2>{formatLongDate(selectedDate, false)}</h2>
      {selectedItems.length ? selectedItems.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} contact={contacts.find((contact) => contact.id === appointment.contactId)} onClick={() => onOpenAppointment(appointment)} onDelete={adminMode && onDeleteAppointment ? () => onDeleteAppointment(appointment) : undefined} compact showDate={false} />) : <EmptyState title="Nothing scheduled" text="There are no appointments on this day." />}
    </section>
  </>
}
