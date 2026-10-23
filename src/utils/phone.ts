export function phoneHref(phone: string, extension = ''): string {
  const number = phone.replace(/[^+\d]/g, '')
  const suffix = extension.replace(/[^\d]/g, '')
  return `tel:${number}${suffix ? `;ext=${suffix}` : ''}`
}
