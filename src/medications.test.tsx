import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { MedicationsPage } from './pages/MedicationsPage'
import { medicationService } from './services/medicationService'
import { MedicationForm } from './components/MedicationForm'
import type { Contact, MedicationDraft } from './types'

vi.mock('./services/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
const provider: Contact = { id: 'provider-1', name: 'Dr. Recorded', contactType: 'doctor', roleOrSpecialty: 'Specialist', organization: '', mapsUrl: '', phone: '', extension: '', notes: '', createdAt: '', updatedAt: '' }
const draft: MedicationDraft = { name: 'Test medication', status: 'active', medicationForm: '', startDate: '', dosage: '', frequency: '', reason: '', providerId: '', prescribingDoctor: '', notes: '' }
beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('MEDS', () => {
  it('supports add, refresh, details, status change, confirmed deletion and existing navigation', async () => {
    const app = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MEDS' }))
    expect(await screen.findByText('No medications added yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add MEDS' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
    expect(screen.getByRole('button', { name: 'Add MEDS' })).toHaveClass('floating-add')
    fireEvent.click(screen.getByRole('button', { name: 'Add MEDS' }))
    fireEvent.change(screen.getByLabelText(/Medication Name/), { target: { value: 'Recorded medication' } })
    fireEvent.change(screen.getByLabelText('Dosage'), { target: { value: 'Recorded dosage' } })
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'Recorded schedule' } })
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-10-23' } })
    fireEvent.change(screen.getByLabelText('Reason for Prescription'), { target: { value: 'Recorded reason' } })
    fireEvent.change(screen.getByLabelText('Medication Form'), { target: { value: 'Other' } })
    fireEvent.change(screen.getByLabelText('Custom Medication Form'), { target: { value: 'Custom recorded form' } })
    fireEvent.change(screen.getByLabelText('Prescribing Doctor'), { target: { value: 'manual' } })
    fireEvent.change(screen.getByLabelText('Doctor Name'), { target: { value: 'Manually recorded doctor' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'First line\nSecond line' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('dialog', { name: 'Recorded medication' })).toHaveTextContent('Manually recorded doctor')
    app.unmount()
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MEDS' }))
    fireEvent.click(await screen.findByRole('button', { name: 'More Info for Recorded medication' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Custom recorded form')
    expect(screen.getByRole('dialog')).toHaveTextContent('October 23, 2026')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'More Info for Recorded medication' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'on_hold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Recorded medication'))
    const [saved] = await medicationService.load()
    expect(saved).toMatchObject({ status: 'on_hold', dosage: 'Recorded dosage', frequency: 'Recorded schedule', startDate: '2026-10-23', notes: 'First line\nSecond line', medicationForm: 'Custom recorded form', prescribingDoctor: 'Manually recorded doctor' })
    expect(screen.getByRole('heading', { name: 'On Hold' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Active' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep medication' }))
    expect(await medicationService.load()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('No medications added yet.')).toBeInTheDocument()
    expect(await medicationService.load()).toHaveLength(0)
    for (const name of ['Home', 'Calendar', 'Provider']) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('sorts statuses and medication names and hides empty groups', async () => {
    for (const [name, status] of [['Zeta', 'active'], ['Beta', 'on_hold'], ['Alpha', 'active'], ['Gamma', 'completed'], ['Delta', 'discontinued']] as const) await medicationService.save({ ...draft, name, status })
    render(<MedicationsPage contacts={[]} adminMode={false} />)
    await screen.findByRole('heading', { name: 'Active' })
    const groups = screen.getAllByRole('region')
    expect(groups.map((group) => within(group).getByRole('heading', { level: 2 }).textContent)).toEqual(['Active', 'Completed', 'Discontinued', 'On Hold'])
    expect(within(groups[0]).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Alpha', 'Zeta'])
  })

  it('records a selected provider without changing the provider record', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<MedicationForm contacts={[provider]} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Medication Name/), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Prescribing Doctor'), { target: { value: provider.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ providerId: provider.id, prescribingDoctor: provider.name, dosage: '', frequency: '', reason: '' })))
  })

  it('keeps entered values after save failure and validates whitespace-only names', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Unable to save. Please try again.'))
    render(<MedicationForm contacts={[]} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Medication Name/), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a medication name.')
    expect(save).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Medication Name/), { target: { value: 'Keep this name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save')
    expect(screen.getByLabelText(/Medication Name/)).toHaveValue('Keep this name')
  })

  it('keeps the correct record and confirmation open when deletion fails', async () => {
    await medicationService.save(draft)
    await medicationService.save({ ...draft, name: 'Keep this other record' })
    vi.spyOn(medicationService, 'delete').mockRejectedValue(new Error('Unable to delete. Try again.'))
    render(<MedicationsPage contacts={[]} adminMode />)
    fireEvent.click(await screen.findByRole('button', { name: 'More Info for Test medication' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to delete')
    expect(screen.getByRole('dialog')).toHaveTextContent('Test medication')
    expect(await medicationService.load()).toHaveLength(2)
  })

  it('offers retry for load failure without showing a misleading empty state', async () => {
    vi.spyOn(medicationService, 'load').mockRejectedValueOnce(new Error('Database update required.')).mockResolvedValueOnce([])
    render(<MedicationsPage contacts={[]} adminMode />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Database update required.')
    expect(screen.queryByRole('button', { name: 'Add MEDS' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No medications added yet.')).toBeInTheDocument()
  })
})
