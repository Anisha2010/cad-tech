import mongoose from 'mongoose'
import { loadE2EEnvironment } from './e2eEnv.js'
import { assertSafeE2EDatabase } from '../src/utils/e2eDatabase.js'
import { hashPassword, normalizeEmail, User } from '../src/models/User.js'

const { mongoUri } = loadE2EEnvironment()
const databaseName = assertSafeE2EDatabase(mongoUri)
const fixtures = [
  { role: 'student', label: 'Student', emailKey: 'E2E_STUDENT_EMAIL', passwordKey: 'E2E_STUDENT_PASSWORD' },
  { role: 'instructor', label: 'Instructor', emailKey: 'E2E_INSTRUCTOR_EMAIL', passwordKey: 'E2E_INSTRUCTOR_PASSWORD' },
  { role: 'admin', label: 'Admin', emailKey: 'E2E_ADMIN_EMAIL', passwordKey: 'E2E_ADMIN_PASSWORD' }
]

for (const fixture of fixtures) {
  if (!process.env[fixture.emailKey]?.trim() || !process.env[fixture.passwordKey]) {
    throw new Error(`${fixture.emailKey} and ${fixture.passwordKey} are required.`)
  }
}

await mongoose.connect(mongoUri)
try {
  for (const fixture of fixtures) {
    const email = normalizeEmail(process.env[fixture.emailKey])
    const passwordHash = await hashPassword(process.env[fixture.passwordKey])
    const fixtureProvider = { provider: 'e2e-fixture', providerUserId: `e2e:${fixture.role}` }
    const existing = await User.findOne({ email }).select('+passwordHash')

    if (!existing) {
      await User.create({
        name: `E2E ${fixture.label}`,
        email,
        phone: null,
        role: fixture.role,
        passwordHash,
        authProviders: [{ provider: 'local', providerUserId: `local:e2e:${fixture.role}` }, fixtureProvider]
      })
      console.log(`E2E ${fixture.label}: created`)
      continue
    }

    const isKnownFixture = existing.authProviders?.some((provider) =>
      provider.provider === 'e2e-fixture' && provider.providerUserId === `e2e:${fixture.role}`
    )
    if (!isKnownFixture) {
      throw new Error(`Configured ${fixture.label} email belongs to a non-fixture account; refusing to modify it.`)
    }

    existing.name = `E2E ${fixture.label}`
    existing.role = fixture.role
    existing.passwordHash = passwordHash
    await existing.save()
    console.log(`E2E ${fixture.label}: reused`)
  }

  console.log(`E2E fixture database validated: ${databaseName}`)
} finally {
  await mongoose.disconnect()
}