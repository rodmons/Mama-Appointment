import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarView } from './components/CalendarView'
import type { Appointment } from './types'

function appointment(id: string, date: string): Appointment {
  return { id, date, startTime: '09:00', endTime: '', purpose: `Appointment ${id}`, contactId: '', locationName: '', address: '', phone: '', mapsUrl: '', notes: '', thingsToBring: [], status: 'confirmed', createdAt: '', updatedAt: '' }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 17, 9, 0, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('calendar cleanup', () => {
  it('uses state colors without appointment dots and shows the legend', () => {
    const { container } = render(<CalendarView appointments={[appointment('past', '2026-08-10'), appointment('today', '2026-08-17'), appointment('next', '2026-08-26')]} contacts={[]} selectedDate="2026-08-26" onSelectDate={vi.fn()} onOpenAppointment={vi.fn()} />)
    expect(container.querySelector('button[aria-label*="August 10"]')).toHaveClass('previous-appointment')
    expect(container.querySelector('button[aria-label*="August 17"]')).toHaveClass('today')
    expect(container.querySelector('button[aria-label*="August 26"]')).toHaveClass('upcoming-appointment', 'selected')
    expect(container.querySelector('.calendar-grid i')).not.toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })

  it('shows the selected date once above appointment cards', () => {
    const { container } = render(<CalendarView appointments={[appointment('next', '2026-08-26')]} contacts={[]} selectedDate="2026-08-26" onSelectDate={vi.fn()} onOpenAppointment={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Wednesday, August 26' })).toBeInTheDocument()
    expect(container.querySelector('.day-agenda .date-tile')).not.toBeInTheDocument()
    expect(container.querySelector('.day-agenda .appointment-card')).toHaveClass('without-date')
  })
})
