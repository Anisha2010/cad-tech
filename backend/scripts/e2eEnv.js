import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractDatabaseName } from '../src/utils/e2eDatabase.js'

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowedKeys = [
  'E2E_MONGODB_URI',
  'E2E_BASE_URL',
  'E2E_API_URL',
  'E2E_STUDENT_EMAIL',
  'E2E_STUDENT_PASSWORD',
  'E2E_INSTRUCTOR_EMAIL',
  'E2E_INSTRUCTOR_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'SESSION_SECRET',
  'FRONTEND_URL',
  'PORT',
  'NODE_ENV'
]

export const loadE2EEnvironment = () => {
  const loaded = {}

  for (const filename of ['.env.e2e', '.env.e2e.local']) {
    const filepath = path.join(backendDirectory, filename)
    if (!fs.existsSync(filepath)) continue
    const parsed = dotenv.parse(fs.readFileSync(filepath))
    for (const [key, value] of Object.entries(parsed)) {
      if (value.trim()) loaded[key] = value
    }
  }

  for (const key of [
    'MONGODB_URI',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL'
  ]) delete process.env[key]

  const backendEnvPath = path.join(backendDirectory, '.env')
  if (fs.existsSync(backendEnvPath)) {
    const backendEnv = dotenv.parse(fs.readFileSync(backendEnvPath))
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (backendEnv[key]?.trim()) process.env[key] = backendEnv[key]
    }
  }

  for (const key of allowedKeys) {
    if (!process.env[key]?.trim() && loaded[key] !== undefined) {
      process.env[key] = loaded[key]
    }
  }

  const apiUrl = process.env.E2E_API_URL?.trim() || 'http://127.0.0.1:5000'
  let apiPort
  try {
    const parsedApiUrl = new URL(apiUrl)
    apiPort = Number(parsedApiUrl.port)
    if (parsedApiUrl.protocol !== 'http:' || parsedApiUrl.hostname !== '127.0.0.1' || !Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535 || parsedApiUrl.pathname !== '/' || parsedApiUrl.search || parsedApiUrl.hash || parsedApiUrl.username || parsedApiUrl.password) {
      throw new Error()
    }
  } catch {
    throw new Error('E2E_API_URL must be an HTTP URL on 127.0.0.1 with an explicit port.')
  }

  const requiredOrigins = {
    FRONTEND_URL: 'http://127.0.0.1:5173',
    E2E_BASE_URL: 'http://127.0.0.1:5173',
    E2E_API_URL: apiUrl
  }
  for (const [key, expected] of Object.entries(requiredOrigins)) {
    if (process.env[key]?.trim() && process.env[key] !== expected) {
      throw new Error(`${key} must equal ${expected} for local E2E.`)
    }
    process.env[key] = expected
  }

  const mongoUri = process.env.E2E_MONGODB_URI
  if (!mongoUri) throw new Error('E2E_MONGODB_URI is required; no database fallback is allowed.')

  process.env.E2E_MODE = 'true'
  process.env.NODE_ENV = 'test'
  process.env.PORT = String(apiPort)
  process.env.MONGODB_URI = mongoUri

  return { mongoUri }
}

export const assertE2EUrls = () => {
  if (process.env.E2E_BASE_URL !== 'http://127.0.0.1:5173') {
    throw new Error('E2E_BASE_URL is required and must equal http://127.0.0.1:5173.')
  }
  try {
    const parsedApiUrl = new URL(process.env.E2E_API_URL)
    const port = Number(parsedApiUrl.port)
    if (parsedApiUrl.protocol !== 'http:' || parsedApiUrl.hostname !== '127.0.0.1' || !Number.isInteger(port) || port < 1 || port > 65535 || parsedApiUrl.pathname !== '/' || parsedApiUrl.search || parsedApiUrl.hash || parsedApiUrl.username || parsedApiUrl.password) {
      throw new Error()
    }
  } catch {
    throw new Error('E2E_API_URL must be an HTTP URL on 127.0.0.1 with an explicit port.')
  }
}

export const assertE2EFixtureEnvironment = () => {
  const mongoUri = process.env.E2E_MONGODB_URI?.trim()
  if (!mongoUri) throw new Error('E2E_MONGODB_URI is required.')
  if (extractDatabaseName(mongoUri) !== 'cadtech_e2e') {
    throw new Error('E2E_MONGODB_URI must target the isolated cadtech_e2e database.')
  }

  const runId = process.env.E2E_RUN_ID?.trim() ?? ''
  if (!/^E2E-\d{10,}-\d+-[a-f\d]{8}$/i.test(runId)) {
    throw new Error('A valid current E2E run ID is required.')
  }

  assertE2EUrls()

  const missingRoles = ['E2E_ADMIN_EMAIL', 'E2E_INSTRUCTOR_EMAIL', 'E2E_STUDENT_EMAIL']
    .filter((key) => !process.env[key]?.trim())
  if (missingRoles.length) {
    throw new Error(`Missing required E2E role identifiers: ${missingRoles.join(', ')}.`)
  }

  return { mongoUri, runId }
}