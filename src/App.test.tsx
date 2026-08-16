import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'

describe('Mama Mona Appointments', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('scrollTo', vi.fn())
  })

  test('keeps Mom Mode safe and supports the core admin appointment and doctor flows', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Good afternoon, Mama')).toBeInTheDocument()
    expect(screen.getByText('Audiogram')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add appointment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Settings/i }))
    const adminSwitch = await screen.findByRole('switch', { name: '' })
    expect(adminSwitch).not.toBeChecked()
    await user.click(adminSwitch)
    expect(adminSwitch).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(await screen.findByRole('button', { name: 'Add appointment' }))
    const appointmentDialog = await screen.findByRole('dialog', { name: 'Add appointment' })
    const purpose = within(appointmentDialog).getByLabelText(/Purpose/)
    const start = within(appointmentDialog).getByLabelText(/Start time/)
    const end = within(appointmentDialog).getByLabelText(/End time/)

    await user.type(purpose, 'Blood Test')
    await user.clear(start)
    await user.type(start, '10:00')
    await user.type(end, '09:30')
    await user.click(within(appointmentDialog).getByRole('button', { name: 'Add appointment' }))
    expect(await within(appointmentDialog).findByText('End time must be after the start time.')).toBeInTheDocument()

    await user.clear(end)
    const doctorSearch = within(appointmentDialog).getByLabelText(/Doctor or care provider/)
    await user.click(doctorSearch)
    await user.click(within(appointmentDialog).getByRole('option', { name: /Dr\. Cho/ }))
    expect(within(appointmentDialog).getByText(/Anesthesiologist/)).toBeInTheDocument()
    await user.click(within(appointmentDialog).getByRole('button', { name: 'Add appointment' }))
    expect(await screen.findByText('Appointment added.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(await screen.findByText('Blood Test')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Doctors' }))
    expect(await screen.findByText('Dr. Cho')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Add doctor' })[0])
    const doctorDialog = await screen.findByRole('dialog', { name: 'Add doctor' })
    await user.type(within(doctorDialog).getByLabelText(/^Name/), 'Dr. Rivera')
    await user.type(within(doctorDialog).getByLabelText(/Profession/), 'Cardiologist')
    await user.click(within(doctorDialog).getByRole('button', { name: 'Add doctor' }))
    expect(await screen.findByText('Doctor added.')).toBeInTheDocument()
    expect(screen.getByText('Dr. Rivera')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Dr. Rivera' }))
    const editDoctorDialog = await screen.findByRole('dialog', { name: 'Edit doctor' })
    await user.type(within(editDoctorDialog).getByLabelText(/Hospital/), 'Surrey Memorial Hospital')
    await user.click(within(editDoctorDialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Doctor updated.')).toBeInTheDocument()
    expect(screen.getByText('Surrey Memorial Hospital')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    await user.click(await screen.findByRole('button', { name: /Blood Test/ }))
    expect(await screen.findByRole('heading', { name: 'Blood Test' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const editAppointmentDialog = await screen.findByRole('dialog', { name: 'Edit appointment' })
    const editPurpose = within(editAppointmentDialog).getByLabelText(/Purpose/)
    await user.clear(editPurpose)
    await user.type(editPurpose, 'Blood Work')
    await user.click(within(editAppointmentDialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Appointment updated.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Blood Work' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const deleteDialog = await screen.findByRole('dialog', { name: 'Delete this appointment?' })
    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete appointment' }))
    expect(await screen.findByText('Appointment deleted.')).toBeInTheDocument()
    expect(screen.queryByText('Blood Work')).not.toBeInTheDocument()
  })
})
