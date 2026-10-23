import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService, ProviderExtensionUnavailableError, ProviderMapUrlUnavailableError } from './dataService'

const { from, query } = vi.hoisted(() => {
  const builder = { select: vi.fn(), order: vi.fn(), update: vi.fn(), insert: vi.fn(), eq: vi.fn(), single: vi.fn() }
  return { from: vi.fn(() => builder), query: builder }
})
vi.mock('./supabase', () => ({ supabase: { from } }))

const row = { id: 'provider-1', name: 'Dr. Lu', contact_type: 'doctor', role_or_specialty: 'ENT', organization: 'Vancouver', phone: '604-555-0100', maps_url: 'https://maps.app.goo.gl/example', extension: '0012', notes: null, created_at: '', updated_at: '' }

beforeEach(() => {
  vi.clearAllMocks()
  for (const method of ['select', 'update', 'insert', 'eq'] as const) query[method].mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
})

describe('provider Supabase persistence', () => {
  it('sends the extension on update and maps it back as a string', async () => {
    const saved = await dataService.saveContact({ name: 'Dr. Lu', contactType: 'doctor', roleOrSpecialty: 'ENT', organization: 'Vancouver', phone: '604-555-0100', mapsUrl: '', extension: '0012', notes: '' }, row.id)
    expect(from).toHaveBeenCalledWith('contacts')
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ maps_url: null, extension: '0012', organization: 'Vancouver' }))
    expect(query.eq).toHaveBeenCalledWith('id', row.id)
    expect(saved.extension).toBe('0012')
  })

  it('stores an empty extension as null and reads older records without one', async () => {
    query.single.mockResolvedValue({ data: { ...row, extension: undefined }, error: null })
    const saved = await dataService.saveContact({ name: 'Reception', contactType: 'clinic', roleOrSpecialty: '', organization: '', phone: '', mapsUrl: '', extension: '', notes: '' })
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ extension: null }))
    expect(saved.extension).toBe('')
  })

  it.each(['PGRST204', '42703'])('saves a blank extension against the old schema after a %s rejection', async (code) => {
    query.single.mockResolvedValueOnce({ data: null, error: { code, message: 'column contacts.extension does not exist' } })
    query.single.mockResolvedValueOnce({ data: { ...row, extension: undefined }, error: null })
    const saved = await dataService.saveContact({ name: 'Dr. Lu', contactType: 'doctor', roleOrSpecialty: 'ENT', organization: 'Vancouver', phone: '604-555-0100', mapsUrl: '', extension: '', notes: 'Keep this note' }, row.id)
    expect(query.update).toHaveBeenCalledTimes(2)
    expect(query.update.mock.calls[1][0]).not.toHaveProperty('extension')
    expect(query.update.mock.calls[1][0]).toMatchObject({ organization: 'Vancouver', notes: 'Keep this note' })
    expect(saved.extension).toBe('')
  })

  it('does not silently discard an entered extension when the column is missing', async () => {
    query.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST204', message: "Could not find the 'extension' column of 'contacts' in the schema cache" } })
    await expect(dataService.saveContact({ name: 'Reception', contactType: 'clinic', roleOrSpecialty: '', organization: '', phone: '', mapsUrl: '', extension: '0012', notes: '' })).rejects.toBeInstanceOf(ProviderExtensionUnavailableError)
    expect(query.insert).toHaveBeenCalledTimes(1)
  })

  it('does not retry an access denial', async () => {
    const error = { code: '42501', message: 'permission denied for table contacts' }
    query.single.mockResolvedValueOnce({ data: null, error })
    await expect(dataService.saveContact({ name: 'Reception', contactType: 'clinic', roleOrSpecialty: '', organization: '', phone: '', mapsUrl: '', extension: '', notes: '' })).rejects.toEqual(error)
    expect(query.insert).toHaveBeenCalledTimes(1)
  })

  it('writes and reads the provider map URL', async () => {
    const saved = await dataService.saveContact({ name: 'Dr. Lu', contactType: 'doctor', roleOrSpecialty: 'ENT', organization: 'Vancouver', mapsUrl: row.maps_url, phone: '', extension: '', notes: '' }, row.id)
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ maps_url: row.maps_url }))
    expect(saved.mapsUrl).toBe(row.maps_url)
  })

  it('saves blank optional fields even when both new columns are missing', async () => {
    query.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST204', message: "Could not find the 'maps_url' column" } })
    query.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST204', message: "Could not find the 'extension' column" } })
    query.single.mockResolvedValueOnce({ data: { ...row, maps_url: undefined, extension: undefined }, error: null })
    const saved = await dataService.saveContact({ name: 'Reception', contactType: 'clinic', roleOrSpecialty: '', organization: '', mapsUrl: '', phone: '', extension: '', notes: '' })
    expect(query.insert).toHaveBeenCalledTimes(3)
    expect(query.insert.mock.calls[2][0]).not.toHaveProperty('maps_url')
    expect(query.insert.mock.calls[2][0]).not.toHaveProperty('extension')
    expect(saved.mapsUrl).toBe('')
  })

  it('does not discard an entered map URL when the column is missing', async () => {
    query.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST204', message: "Could not find the 'maps_url' column" } })
    await expect(dataService.saveContact({ name: 'Reception', contactType: 'clinic', roleOrSpecialty: '', organization: '', mapsUrl: row.maps_url, phone: '', extension: '', notes: '' })).rejects.toBeInstanceOf(ProviderMapUrlUnavailableError)
    expect(query.insert).toHaveBeenCalledTimes(1)
  })
})
