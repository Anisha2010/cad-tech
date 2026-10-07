import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:5173'
const DEFAULT_E2E_API_URL = 'http://127.0.0.1:5000'

export let E2E_BASE_URL = DEFAULT_E2E_BASE_URL
export let E2E_API_URL = DEFAULT_E2E_API_URL

export function loadE2EEnvironment(directory = process.cwd()) {
  const fileValues = {}

  for (const filename of ['.env.e2e', '.env.e2e.local']) {
    const filepath = path.resolve(directory, filename)
    if (!fs.existsSync(filepath)) continue

    const parsed = dotenv.parse(fs.readFileSync(filepath))
    for (const [key, value] of Object.entries(parsed)) {
      if (value.trim()) fileValues[key] = value
    }
  }

  for (const [key, value] of Object.entries(fileValues)) {
    if (!process.env[key]?.trim()) process.env[key] = value
  }

  E2E_BASE_URL = process.env.E2E_BASE_URL?.trim() || DEFAULT_E2E_BASE_URL
  E2E_API_URL = process.env.E2E_API_URL?.trim() || DEFAULT_E2E_API_URL

  return process.env
}

export function assertE2EUrls() {
  if (E2E_BASE_URL !== DEFAULT_E2E_BASE_URL) {
    throw new Error('E2E_BASE_URL is required and must equal http://127.0.0.1:5173.')
  }
  try {
    const parsedApiUrl = new URL(E2E_API_URL)
    const port = Number(parsedApiUrl.port)
    if (parsedApiUrl.protocol !== 'http:' || parsedApiUrl.hostname !== '127.0.0.1' || !Number.isInteger(port) || port < 1 || port > 65535 || parsedApiUrl.pathname !== '/' || parsedApiUrl.search || parsedApiUrl.hash || parsedApiUrl.username || parsedApiUrl.password) {
      throw new Error()
    }
  } catch {
    throw new Error('E2E_API_URL must be an HTTP URL on 127.0.0.1 with an explicit port.')
  }
}