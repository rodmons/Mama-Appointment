import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimePlanner } from './components/TimePlanner'
import { SettingsPage } from './pages/SettingsPage'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

function changeDuration(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(`${label} amount`), { target: { value } })
}

describe('Time Planner', () => {
  it('opens from the top of Account and closes without changing Account', () => {
    render(<SettingsPage configured role="viewer" userEmail="mama@example.com" onLogout={vi.fn()} onResetDemo={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Time Planner' })
    expect(button.compareDocumentPosition(screen.getByRole('heading', { name: 'Account' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(button)
    expect(screen.getByRole('dialog', { name: 'Time Planner' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Time Planner' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })

  it('calculates the stated formula and updates immediately', () => {
    render(<TimePlanner />)
    changeDuration('Getting Ready', '45')
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText('7:15 AM')).toBeInTheDocument()
    changeDuration('Drive', '30')
    expect(screen.getByText('8:30 AM')).toBeInTheDocument()
  })

  it('handles AM/PM, midnight crossings, zero, and invalid values', () => {
    render(<TimePlanner />)
    fireEvent.change(screen.getByLabelText('Appointment hour'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Appointment minute'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Appointment AM or PM'), { target: { value: 'AM' } })
    changeDuration('Contingency', '0')
    changeDuration('Parking / Walking', '0')
    changeDuration('Drive', '30')
    changeDuration('Getting Ready', '15')
    expect(screen.getByText('11:45 PM')).toBeInTheDocument()
    expect(screen.getAllByText(/Previous day/)).toHaveLength(2)
    expect(screen.getByText('11:30 PM')).toBeInTheDocument()

    changeDuration('Drive', '-1')
    expect(screen.getByText(/positive whole number of minutes/i)).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('restores saved inputs and can reset them', () => {
    const { unmount } = render(<TimePlanner />)
    changeDuration('Drive', '2')
    fireEvent.change(screen.getByLabelText('Drive unit'), { target: { value: 'hours' } })
    unmount()
    render(<TimePlanner />)
    expect(screen.getByLabelText('Drive amount')).toHaveValue(2)
    expect(screen.getByLabelText('Drive unit')).toHaveValue('hours')
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(screen.getByLabelText('Drive amount')).toHaveValue(60)
    expect(screen.getByLabelText('Drive unit')).toHaveValue('minutes')
  })
})
