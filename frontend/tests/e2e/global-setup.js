import { assertE2EUrls, E2E_API_URL, loadE2EEnvironment } from './helpers/e2eEnvironment.js'

const getDatabaseName = (mongoUri) => {
  try {
    const parsedUri = new URL(mongoUri)

    return decodeURIComponent(
      parsedUri.pathname.replace(/^\/+/, "")
    )
  } catch {
    return ""
  }
}

export default async function globalSetup() {
  loadE2EEnvironment()

  const requiredKeys = [
    "E2E_BASE_URL",
    "E2E_API_URL",
    "E2E_MONGODB_URI",
    "E2E_ADMIN_EMAIL",
    "E2E_ADMIN_PASSWORD",
    "E2E_STUDENT_EMAIL",
    "E2E_STUDENT_PASSWORD",
    "E2E_INSTRUCTOR_EMAIL",
    "E2E_INSTRUCTOR_PASSWORD"
  ]

  const missing = requiredKeys.filter(
    (key) => !process.env[key]?.trim()
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required E2E variables: ${missing.join(", ")}`
    )
  }

  assertE2EUrls()

  const configuredDatabaseName = getDatabaseName(
    process.env.E2E_MONGODB_URI
  )

  if (!configuredDatabaseName) {
    throw new Error("E2E_MONGODB_URI is missing a valid database name.")
  }

  if (configuredDatabaseName !== "cadtech_e2e") {
    throw new Error(
      `Unsafe E2E database name: ${configuredDatabaseName}. Expected cadtech_e2e.`
    )
  }

  const healthResponse = await fetch(`${E2E_API_URL}/health`)

  if (!healthResponse.ok) {
    throw new Error(
      `E2E backend health check failed with status ${healthResponse.status}.`
    )
  }

  const health = await healthResponse.json()

  // Health response currently returns database at top level:
  // { status, service, database, databaseStatus }
  const connectedDatabaseName =
    health.database ??
    health.data?.database ??
    health.databaseName ??
    health.data?.databaseName

  if (!connectedDatabaseName) {
    throw new Error(
      "E2E backend health response did not include the database name."
    )
  }

  if (connectedDatabaseName !== configuredDatabaseName) {
    throw new Error(
      `E2E database mismatch. Configured: ${configuredDatabaseName}, connected: ${connectedDatabaseName}.`
    )
  }

  if (connectedDatabaseName !== "cadtech_e2e") {
    throw new Error(
      `Refusing E2E tests against database: ${connectedDatabaseName}.`
    )
  }

  const databaseStatus = health.databaseStatus ?? health.data?.databaseStatus
  if (databaseStatus !== "connected") {
    throw new Error(
      `E2E backend database is not connected: ${databaseStatus || "unknown"}.`
    )
  }

  console.log('E2E backend database confirmed: cadtech_e2e')
}