import { loadE2EEnvironment } from './e2eEnv.js'
import { assertSafeE2EDatabase } from '../src/utils/e2eDatabase.js'

const { mongoUri } = loadE2EEnvironment()
const databaseName = assertSafeE2EDatabase(mongoUri)
const { isAssignmentStorageConfigured } = await import('../src/config/storage.js')

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('A dedicated E2E SESSION_SECRET of at least 32 characters is required.')
}

const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js')
await connectDatabase()
const { default: app } = await import('../src/app.js')
const port = Number(process.env.PORT || 5000)
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`CadTech E2E API listening on 127.0.0.1:${port} (database: ${databaseName})`)
  console.log(`Cloudinary storage configured: ${isAssignmentStorageConfigured() ? 'yes' : 'no'}`)
})

let shuttingDown = false
const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  server.close(async () => {
    await disconnectDatabase()
    console.log(`E2E API stopped after ${signal}.`)
    process.exit(0)
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))