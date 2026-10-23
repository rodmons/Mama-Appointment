import type { Appointment, Contact } from '../types'

export function validMapUrl(value: string): string {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

export function appointmentMapUrl(appointment: Appointment, provider?: Contact): string {
  const savedUrl = validMapUrl(provider?.mapsUrl || '') || validMapUrl(appointment.mapsUrl)
  if (savedUrl) return savedUrl
  const query = appointment.address.trim() || appointment.locationName.trim()
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : ''
}
