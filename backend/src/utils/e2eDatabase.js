export const extractDatabaseName = (mongoUri) => {
  if (typeof mongoUri !== 'string' || !mongoUri.trim()) return ''

  try {
    const parsed = new URL(mongoUri)
    if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) return ''
    return decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] || '')
  } catch {
    return ''
  }
}

export const assertSafeE2EDatabase = (mongoUri) => {
  const databaseName = extractDatabaseName(mongoUri)
  const normalizedName = databaseName.toLowerCase()

  if (
    !databaseName ||
    ['admin', 'local', 'cadtech'].includes(normalizedName) ||
    /(^|[-_])(prod|production)([-_]|$)/.test(normalizedName) ||
    (!normalizedName.includes('e2e') && !normalizedName.includes('test'))
  ) {
    throw new Error('E2E tests require a database name containing e2e or test.')
  }

  return databaseName
}