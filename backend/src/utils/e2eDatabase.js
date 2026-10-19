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

export const assertCadTechE2EDatabase = (mongoUri) => {
  const databaseName = assertSafeE2EDatabase(mongoUri)
  if (databaseName !== 'cadtech_e2e') {
    throw new Error('E2E_MONGODB_URI must target the isolated cadtech_e2e database.')
  }
  return databaseName
}

export const assertSafeDevelopmentDatabase = (mongoUri) => {
  const databaseName = extractDatabaseName(mongoUri)
  if (databaseName.toLowerCase() !== 'cadtech') {
    throw new Error(
      'Local development must use the cadtech database. Set MONGODB_URI in backend/.env to the cadtech target.'
    )
  }
  return databaseName
}