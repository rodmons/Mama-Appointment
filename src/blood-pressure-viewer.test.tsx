import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { bloodPressureService } from './services/bloodPressureService'

vi.mock('./services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'mom-id', email: 'mom@example.com' } } } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } },
}))
vi.mock('./services/dataService', () => ({
  dataService: {
    getAccessRole: vi.fn().mockResolvedValue('viewer'),
    load: vi.fn().mockResolvedValue({ appointments: [], contacts: [] }),
  },
}))
vi.mock('./services/bloodPressureService', async (original) => ({
  ...await original<typeof import('./services/bloodPressureService')>(),
  bloodPressureService: {
    load: vi.fn().mockResolvedValue([]),
    save: vi.fn(async (draft) => ({ ...draft, id: 'saved-reading', createdAt: '2026-10-23T17:00:00Z' })),
  },
}))
afterEach(cleanup)

it('lets an authenticated Mom viewer log and edit BP without an Admin Mode switch', async () => {
  window.scrollTo = vi.fn()
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'BP' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Add BP' }))
  expect(screen.queryByRole('switch', { name: 'Admin Mode' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Systolic'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Diastolic'), { target: { value: '81' } })
  fireEvent.change(screen.getByLabelText('Pulse'), { target: { value: '72' } })
  fireEvent.change(screen.getByLabelText('Before/After pills'), { target: { value: 'before' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
  await waitFor(() => expect(bloodPressureService.save).toHaveBeenCalledOnce())
  expect(await screen.findByRole('table')).toHaveTextContent('Before pills')
  fireEvent.click(screen.getByRole('button', { name: /Edit BP from/ }))
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Edit BP')
  fireEvent.change(screen.getByLabelText('Pulse'), { target: { value: '80' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
  await waitFor(() => expect(bloodPressureService.save).toHaveBeenLastCalledWith(expect.objectContaining({ pulse: 80 }), 'saved-reading'))
  expect(screen.getByRole('row', { name: 'Average of all logs' })).toHaveTextContent('80bpm')
})
