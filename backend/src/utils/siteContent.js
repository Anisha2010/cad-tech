export const normalizeCmsText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

export const normalizeCmsListItem = (value, limit = 20) => {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\n|,/) : []

  const normalized = rawItems
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit)

  return Array.from(new Set(normalized))
}

export const buildSlugFromTitle = (title) => {
  const base = normalizeCmsText(title, 'content').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'content'
}

export default { normalizeCmsText, normalizeCmsListItem, buildSlugFromTitle }
