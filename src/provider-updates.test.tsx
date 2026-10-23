import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppointmentForm, ContactForm } from './components/Forms'
import { AppointmentDetail } from './components/AppointmentDetail'
import { ContactsPage } from './pages/ContactsPage'
import { HomePage } from './pages/HomePage'
import { AppointmentCard } from './components/AppointmentCard'
import { appointmentMapUrl } from './utils/maps'
import { dataService } from './services/dataService'
import type { Appointment, Contact, ContactDraft } from './types'

vi.mock('./services/supabase', () => ({ supabase: null }))
afterEach(() => { cleanup(); localStorage.clear() })

const provider: Contact = {
  id: 'provider-1', name: 'Dr. Laskin', contactType: 'doctor', roleOrSpecialty: 'Medical Oncologist',
  organization: 'BCCA Vancouver', phone: '604 877 6000', mapsUrl: '', extension: '0042', notes: '', createdAt: '', updatedAt: '',
}
const appointment: Appointment = {
  id: 'visit-1', date: '2026-10-26', startTime: '10:30', endTime: '', purpose: 'Immunotherapy',
  contactId: provider.id, locationName: 'Surrey clinic', address: '123 Surrey Street', phone: '', mapsUrl: '',
  notes: '', thingsToBring: [], status: 'confirmed', createdAt: '', updatedAt: '',
}

describe('provider updates', () => {
  it('edits, saves, reloads and displays an extension beside the phone', async () => {
    const onSave = vi.fn(async (draft: ContactDraft) => { await dataService.saveContact(draft, provider.id) })
    localStorage.setItem('mama-mona-contacts', JSON.stringify([provider]))
    const { unmount } = render(<ContactForm contact={provider} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/Location/)).toHaveValue('BCCA Vancouver')
    fireEvent.change(screen.getByLabelText(/Extension/), { target: { value: '0088' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mapsUrl: '', extension: '0088' })))
    unmount()
    const { contacts } = await dataService.load()
    expect(contacts[0].extension).toBe('0088')
    render(<ContactsPage contacts={contacts} adminMode onEdit={vi.fn()} onAdd={vi.fn()} />)
    const phone = screen.getByRole('link', { name: '604 877 6000 Ext. 0088' })
    expect(phone).toHaveAttribute('href', 'tel:6048776000;ext=0088')
    expect(screen.getByRole('button', { name: 'Add provider' }).querySelector('svg')).toBeNull()
  })

  it('loads older providers with no extension and keeps it optional', async () => {
    const { extension: _extension, ...oldProvider } = provider
    localStorage.setItem('mama-mona-contacts', JSON.stringify([oldProvider]))
    const { contacts } = await dataService.load()
    expect(contacts[0].extension).toBe('')
    render(<ContactForm contact={contacts[0]} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/Extension/)).toHaveValue('')
  })

  it('keeps provider entries and shows a persistent error when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Extensions need a database update before they can be saved.'))
    render(<ContactForm contact={provider} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Extension/), { target: { value: '0088' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Extensions need a database update')
    expect(screen.getByLabelText(/Extension/)).toHaveValue('0088')
    expect(screen.getByLabelText(/Name or provider label/)).toHaveValue('Dr. Laskin')
  })

  it('keeps the appointment location and address when choosing a different provider', async () => {
    const otherProvider = { ...provider, id: 'provider-2', name: 'Dr. Lu', organization: 'Vancouver office' }
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<AppointmentForm appointment={appointment} contacts={[provider, otherProvider]} onSave={onSave} onAddContact={vi.fn()} onCancel={vi.fn()} />)
    const search = screen.getByPlaceholderText('Search provider')
    fireEvent.change(search, { target: { value: 'Dr. Lu' } })
    fireEvent.click(screen.getByRole('option', { name: /Dr. Lu/ }))
    expect(screen.getByLabelText(/Location/)).toHaveValue('Surrey clinic')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ contactId: otherProvider.id, locationName: 'Surrey clinic', address: '123 Surrey Street' })))
  })

  it('includes the provider extension when calling, but not for a different appointment phone', () => {
    const props = { contact: provider, adminMode: false, onBack: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onDelete: vi.fn() }
    const { rerender } = render(<AppointmentDetail {...props} appointment={appointment} />)
    expect(screen.getByText('Ext. 0042')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:6048776000;ext=0042')
    rerender(<AppointmentDetail {...props} appointment={{ ...appointment, phone: '604-555-1234' }} />)
    expect(screen.queryByText('Ext. 0042')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:6045551234')
  })

  it('saves and reloads a provider map URL entered below Location', async () => {
    const mapsUrl = 'https://maps.app.goo.gl/provider-map'
    const onSave = vi.fn(async (draft: ContactDraft) => { await dataService.saveContact(draft, provider.id) })
    localStorage.setItem('mama-mona-contacts', JSON.stringify([provider]))
    const { unmount } = render(<ContactForm contact={provider} onSave={onSave} onCancel={vi.fn()} />)
    const locationInput = screen.getByLabelText(/Location/)
    const mapInput = screen.getByLabelText(/Map URL/)
    expect(locationInput.compareDocumentPosition(mapInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.change(mapInput, { target: { value: ` ${mapsUrl} ` } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mapsUrl })))
    unmount()
    const { contacts } = await dataService.load()
    expect(contacts[0].mapsUrl).toBe(mapsUrl)
    render(<ContactForm contact={contacts[0]} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/Map URL/)).toHaveValue(mapsUrl)
  })

  it('rejects an invalid provider map URL without losing entered values', () => {
    const onSave = vi.fn()
    render(<ContactForm contact={provider} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Map URL/), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText(/Please paste a full map URL/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Name or provider label/)).toHaveValue(provider.name)
  })

  it('opens the provider map from Home without triggering appointment details', () => {
    const onOpen = vi.fn()
    const mapsUrl = 'https://maps.app.goo.gl/provider-map'
    const visit = { ...appointment, date: '2099-01-01' }
    const { container } = render(<HomePage appointments={[visit]} contacts={[{ ...provider, mapsUrl }]} onOpen={onOpen} />)
    const link = screen.getByRole('link', { name: 'Surrey clinic' })
    expect(link).toHaveAttribute('href', mapsUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(container.querySelector('button a')).toBeNull()
    fireEvent.click(link)
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View details for Immunotherapy' }))
    expect(onOpen).toHaveBeenCalledWith(visit)
  })

  it('provides an independent map link on smaller appointment cards', () => {
    const onClick = vi.fn()
    render(<AppointmentCard appointment={appointment} contact={{ ...provider, mapsUrl: 'https://maps.app.goo.gl/provider-map' }} onClick={onClick} />)
    expect(screen.getByRole('link', { name: 'Surrey clinic' })).toHaveAttribute('href', 'https://maps.app.goo.gl/provider-map')
    fireEvent.click(screen.getByRole('link', { name: 'Surrey clinic' }))
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Immunotherapy/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('prioritizes the saved provider map and falls back to the appointment map or a search', () => {
    expect(appointmentMapUrl({ ...appointment, mapsUrl: 'https://example.com/appointment-map' }, { ...provider, mapsUrl: 'https://example.com/provider-map' })).toBe('https://example.com/provider-map')
    expect(appointmentMapUrl({ ...appointment, mapsUrl: 'https://example.com/appointment-map' }, provider)).toBe('https://example.com/appointment-map')
    expect(appointmentMapUrl(appointment, provider)).toBe('https://www.google.com/maps/search/?api=1&query=123%20Surrey%20Street')
    expect(appointmentMapUrl({ ...appointment, address: '', mapsUrl: 'javascript:alert(1)' }, provider)).toBe('https://www.google.com/maps/search/?api=1&query=Surrey%20clinic')
    expect(appointmentMapUrl({ ...appointment, address: '', locationName: '' }, provider)).toBe('')
  })
})
