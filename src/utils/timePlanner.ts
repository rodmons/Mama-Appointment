export const MINUTES_PER_DAY = 24 * 60

export function minutesToTimeParts(minutes: number) {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours24 = Math.floor(normalized / 60)
  return {
    hour: hours24 % 12 || 12,
    minute: normalized % 60,
    period: hours24 < 12 ? 'AM' as const : 'PM' as const,
  }
}

export function timePartsToMinutes(hour: number, minute: number, period: 'AM' | 'PM') {
  return (hour % 12) * 60 + minute + (period === 'PM' ? 12 * 60 : 0)
}

export function formatPlannerTime(minutes: number) {
  const { hour, minute, period } = minutesToTimeParts(minutes)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

export function dayOffsetLabel(minutes: number) {
  const offset = Math.floor(minutes / MINUTES_PER_DAY)
  if (offset === -1) return 'Previous day'
  if (offset < -1) return `${Math.abs(offset)} days earlier`
  if (offset === 1) return 'Next day'
  if (offset > 1) return `${offset} days later`
  return ''
}
