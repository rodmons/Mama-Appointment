import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { BloodPressurePage } from './pages/BloodPressurePage'
import { bloodPressureService } from './services/bloodPressureService'
import { dataService } from './services/dataService'

vi.mock('./services/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function fillReading(takenAt = '2026-10-23T10:30') {
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: takenAt } })
  fireEvent.change(screen.getByLabelText('Systolic'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Diastolic'), { target: { value: '81' } })
  fireEvent.change(screen.getByLabelText('Pulse'), { target: { value: '72' } })
  fireEvent.change(screen.getByLabelText('Before/After pills'), { target: { value: 'after' } })
}

describe('BP logging', () => {
  it('logs without Admin Mode, persists after remount and orders by measurement time', async () => {
    const app = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'BP' }))
    expect(within(screen.getByRole('navigation')).getAllByRole('button').map((button) => button.textContent)).toEqual(['Home', 'Calendar', 'Provider', 'MEDS', 'BP'])
    expect(screen.getByRole('switch', { name: 'Admin Mode' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(await screen.findByRole('button', { name: 'Add BP' }))
    fillReading()
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Add BP' }))
    fillReading('2026-10-22T09:00')
    fireEvent.change(screen.getByLabelText('Systolic'), { target: { value: '119' } })
    fireEvent.change(screen.getByLabelText('Before/After pills'), { target: { value: 'before' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4))
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Date', 'Systolic', 'Diastolic', 'Pulse', 'Before/After pills'])
    const averages = screen.getByRole('row', { name: 'Average of all logs' })
    expect(averages).toHaveTextContent('All 2 logs')
    expect(within(averages).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['121mmHg', '81mmHg', '72bpm', '—'])
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('1238172After pills')
    expect(screen.getAllByRole('row')[3]).toHaveTextContent('1198172Before pills')
    app.unmount()
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'BP' }))
    expect(await screen.findByRole('table')).toHaveTextContent('123')
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect((await bloodPressureService.load())[0].takenAt).toBe(new Date('2026-10-23T10:30').toISOString())
  })

  it('edits in Mom Mode, recalculates all-log averages, resorts and preserves the original record', async () => {
    const draft = { takenAt: '2026-10-23T17:00:00Z', systolic: 123, diastolic: 81, pulse: 72, pillTiming: 'before' as const }
    const first = await bloodPressureService.save(draft)
    await bloodPressureService.save({ ...draft, takenAt: '2026-10-22T17:00:00Z', systolic: 119 })
    render(<BloodPressurePage />)
    const edits = await screen.findAllByRole('button', { name: /Edit BP from/ })
    fireEvent.click(edits[1])
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Edit BP')
    expect(screen.getByLabelText('Systolic')).toHaveValue(119)
    fillReading('2026-10-24T10:30')
    fireEvent.change(screen.getByLabelText('Systolic'), { target: { value: '130' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('1308172After pills')
    expect(screen.getByRole('row', { name: 'Average of all logs' })).toHaveTextContent('126.5mmHg')
    const saved = await bloodPressureService.load()
    expect(saved).toHaveLength(2)
    expect(saved.find((reading) => reading.id === first.id)).toEqual(first)
    cleanup()
    render(<BloodPressurePage />)
    expect(await screen.findByRole('table')).toHaveTextContent('126.5')
  })

  it('keeps an edited reading open after failure and allows a retry without duplicates', async () => {
    const saved = await bloodPressureService.save({ takenAt: '2026-10-23T17:00:00Z', systolic: 123, diastolic: 81, pulse: 72, pillTiming: 'before' })
    vi.spyOn(bloodPressureService, 'save').mockRejectedValueOnce(new Error('Editing needs a database update.'))
    render(<BloodPressurePage />)
    fireEvent.click(await screen.findByRole('button', { name: /Edit BP from/ }))
    fireEvent.change(screen.getByLabelText('Pulse'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('database update')
    expect(screen.getByLabelText('Pulse')).toHaveValue(80)
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await bloodPressureService.load()).toEqual([{ ...saved, takenAt: new Date(saved.takenAt).toISOString(), pulse: 80 }])
  })

  it('keeps entered values and the form open after a save error', async () => {
    vi.spyOn(bloodPressureService, 'save').mockRejectedValueOnce(new Error('Unable to save. Try again.'))
    render(<BloodPressurePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add BP' }))
    fillReading()
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save')
    expect(screen.getByLabelText('Systolic')).toHaveValue(123)
    fireEvent.click(screen.getByRole('button', { name: 'Save BP' }))
    expect(await screen.findByRole('table')).toHaveTextContent('123')
  })

  it('shows a retryable migration error and recovers without a false empty state', async () => {
    vi.spyOn(bloodPressureService, 'load').mockRejectedValueOnce(new Error('BP needs a database update.')).mockResolvedValueOnce([])
    render(<BloodPressurePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('database update')
    expect(screen.queryByText('No BP readings yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add BP' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Add BP' })).toBeInTheDocument()
  })

  it('keeps one floating provider button and never shows an appointment button on BP', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Provider' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
    const buttons = screen.getAllByRole('button', { name: 'Add provider' })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveClass('floating-add')
    fireEvent.click(screen.getByRole('button', { name: 'BP' }))
    expect(await screen.findByRole('button', { name: 'Add BP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add appointment' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add BP' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Admin Mode' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Add BP')
  })

  it('rejects invalid readings and preserves unreadable local data; reset clears BP', async () => {
    const draft = { takenAt: '2026-10-23T17:00:00Z', systolic: 123, diastolic: 81, pulse: 72, pillTiming: 'before' as const }
    await expect(bloodPressureService.save({ ...draft, pulse: 1.5 })).rejects.toThrow('whole numbers')
    await expect(bloodPressureService.save({ ...draft, takenAt: '' })).rejects.toThrow('date and time')
    localStorage.setItem('mama-mona-blood-pressure', '{broken')
    await expect(bloodPressureService.save(draft)).rejects.toThrow('stored records have been kept')
    expect(localStorage.getItem('mama-mona-blood-pressure')).toBe('{broken')
    dataService.resetDemo()
    expect(await bloodPressureService.load()).toEqual([])
  })
})
