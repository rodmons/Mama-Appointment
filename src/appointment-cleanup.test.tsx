import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppointmentDetail } from './components/AppointmentDetail'
import { ConfirmDialog } from './components/Forms'
import { HomePage } from './pages/HomePage'
import type { Appointment, Contact } from './types'

afterEach(cleanup)

const appointment: Appointment = {
  id: 'appointment-1', date: '2026-08-26', startTime: '09:00', endTime: '10:00', purpose: 'Surgery follow up',
  contactId: 'contact-1', locationName: '', address: '1081 Burrard Street', phone: '', mapsUrl: '', notes: '',
  thingsToBring: [], status: 'confirmed', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
}

const contact: Contact = {
  id: 'contact-1', name: 'Dr. Lu', contactType: 'doctor', roleOrSpecialty: 'ENT', organization: "St. Paul's",
  phone: '604-555-0100', notes: '', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
}

describe('appointment cleanup', () => {
  it('shows contact organization and a simplified next-appointment footer', () => {
    render(<HomePage appointments={[appointment]} contacts={[contact]} onOpen={vi.fn()} />)
    expect(screen.queryByText("Here’s what’s coming up.")).not.toBeInTheDocument()
    expect(screen.getByText('Dr. Lu - ENT')).toBeInTheDocument()
    expect(screen.getByText("St. Paul's")).toBeInTheDocument()
    expect(screen.getByText('View details')).toBeInTheDocument()
  })

  it('shows Not available when the contact has no organization', () => {
    render(<HomePage appointments={[appointment]} contacts={[{ ...contact, organization: '' }]} onOpen={vi.fn()} />)
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('shows the large short date and complete contact hierarchy in details', () => {
    const { container } = render(<AppointmentDetail appointment={appointment} contact={contact} adminMode onBack={vi.fn()} onEdit={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />)
    expect(container.querySelector('.detail-short-date')).toHaveTextContent('AUG 26')
    expect(screen.getAllByText('Dr. Lu - ENT')).toHaveLength(2)
    expect(screen.getAllByText("St. Paul's")).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:6045550100')
    expect(screen.getByRole('button', { name: 'Appointment Cancelled' })).toBeInTheDocument()
  })

  it('uses the requested cancellation confirmation wording', () => {
    render(<ConfirmDialog title="Was appointment cancelled?" message="It will stay in the calendar with cancelled label." cancelLabel="No, keep appointment" confirmLabel="Yes, Appointment Cancelled" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Was appointment cancelled?' })).toBeInTheDocument()
    expect(screen.getByText('It will stay in the calendar with cancelled label.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, keep appointment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes, Appointment Cancelled' })).toBeInTheDocument()
  })
})
