import crypto from 'node:crypto'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { User, hashPassword, normalizeEmail } from '../src/models/User.js'
import { isValidPassword } from '../src/validators/authValidator.js'
import config from '../src/config/environment.js'

const createAdmin = async () => {
  const name = String(process.env.ADMIN_NAME || '').trim()
  const email = normalizeEmail(process.env.ADMIN_EMAIL)
  const password = String(process.env.ADMIN_PASSWORD || '')

  if (!name || !email || !password) throw new Error('ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.')
  if (!isValidPassword(password)) throw new Error('ADMIN_PASSWORD must be at least 8 characters long.')
  if (!config.mongodb_uri) throw new Error('MONGODB_URI environment variable is required.')

  await connectDatabase()
  const existingUser = await User.findOne({ email }).select('_id').lean()
  if (existingUser) {
    console.log('A user with this email already exists. No changes were made.')
    return
  }

  await User.create({
    name,
    email,
    role: 'admin',
    passwordHash: await hashPassword(password),
    authProviders: [{ provider: 'local', providerUserId: `local:${crypto.randomUUID()}` }]
  })
  console.log('Admin account created successfully. Remove ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD from the environment now.')
}

createAdmin()
  .catch((error) => {
    console.error(`Admin account creation failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(disconnectDatabase)