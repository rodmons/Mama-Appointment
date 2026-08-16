import type { Appointment } from '../types'

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLongDate(date: string, includeYear = true): string {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}),
  }).format(parseLocalDate(date))
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(date)
}

export function formatTime(time: string): string {
  if (!time) return ''
  const [hourValue, minute] = time.split(':').map(Number)
  const period = hourValue >= 12 ? 'PM' : 'AM'
  const hour = hourValue % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

export function formatTimeRange(start: string, end?: string): string {
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function relativeDate(date: string, now = new Date()): string {
  const diff = Math.round((parseLocalDate(date).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1 && diff < 7) return `In ${diff} days`
  if (diff === 7) return 'In 1 week'
  if (diff > 7 && diff <= 21 && diff % 7 === 0) return `In ${diff / 7} weeks`
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(parseLocalDate(date))
}

export function appointmentTimestamp(appointment: Appointment): number {
  const [hours, minutes] = appointment.startTime.split(':').map(Number)
  const date = parseLocalDate(appointment.date)
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

export function isUpcoming(appointment: Appointment, now = new Date()): boolean {
  return appointment.status !== 'cancelled' && appointmentTimestamp(appointment) >= now.getTime()
}

export function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b))
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning, Mama'
  if (hour < 17) return 'Good afternoon, Mama'
  return 'Good evening, Mama'
}

export function monthGrid(cursor: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return { date, inMonth: date.getMonth() === cursor.getMonth() }
  })
}
