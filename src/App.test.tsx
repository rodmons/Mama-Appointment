import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AccessPendingPage, SignInPage } from './pages/AuthGate'
import { isSupabaseConfigured } from './services/supabase'

afterEach(cleanup)

describe('Mama Mona Appointments', () => {
  it('shows the correct landing experience for the current configuration', async () => {
    window.scrollTo = vi.fn()
    render(<App />)

    if (isSupabaseConfigured) {
      expect(await screen.findByRole('heading', { name: 'Welcome to Mama Mona' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sign in securely/i })).toBeInTheDocument()
      return
    }

    expect(await screen.findByText(/Good (morning|afternoon|evening), Mama/)).toBeInTheDocument()
    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Contacts/i }))
    expect(await screen.findByRole('heading', { name: 'Doctors' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nurses' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Mom Mode/i }))
    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: /Admin Mode/i }))
    expect(screen.getByText(/Admin Mode is on/i)).toBeInTheDocument()
  })

  it('shows a friendly sign-in error', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    render(<SignInPage onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'mama@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('That email or password did not work'))
  })

  it('does not reveal data to a signed-in account that is not approved', () => {
    render(<AccessPendingPage email="new@example.com" onLogout={vi.fn()} />)

    expect(screen.getByText('new@example.com')).toBeInTheDocument()
    expect(screen.getByText(/not been added to Mama Mona/i)).toBeInTheDocument()
  })
})
