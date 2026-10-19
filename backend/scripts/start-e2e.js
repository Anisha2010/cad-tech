import { loadE2EEnvironment } from './e2eEnv.js'
import { assertCadTechE2EDatabase } from '../src/utils/e2eDatabase.js'

const startE2EServer = async () => {
  const { mongoUri } = loadE2EEnvironment()
  const databaseName = assertCadTechE2EDatabase(mongoUri)
  const { isAssignmentStorageConfigured } = await import('../src/config/storage.js')

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('A dedicated E2E SESSION_SECRET of at least 32 characters is required.')
  }

  const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js')
  const { closeSessionStore } = await import('../src/config/session.js')
  let server

  try {
    await connectDatabase()
    const { CadOrder } = await import('../src/models/CadOrder.js')
    const { verifyCadOrderReservationIndexes } = await import('../src/utils/cadOrderReservationIndexes.js')
    await verifyCadOrderReservationIndexes(CadOrder.collection)
    const { default: app } = await import('../src/app.js')
    const port = Number(process.env.PORT || 5000)
    server = await new Promise((resolve, reject) => {
      const httpServer = app.listen(port, '127.0.0.1')
      httpServer.once('error', reject)
      httpServer.once('listening', () => resolve(httpServer))
    })
    console.info('[Server] CadTech E2E API listening.', {
      port,
      database: databaseName,
      environment: 'e2e',
      cloudinaryConfigured: isAssignmentStorageConfigured()
    })
  } catch (error) {
    console.error('[Server] E2E startup failed.', {
      database: databaseName,
      environment: 'e2e',
      message: error.message,
      ...(error.safeDetails ? { mongo: error.safeDetails } : {})
    })
    try {
      await closeSessionStore()
    } catch {
      console.error('[Server] E2E session-store cleanup failed.', { database: databaseName, environment: 'e2e' })
    }
    try {
      await disconnectDatabase()
    } catch {
      console.error('[Server] E2E database cleanup failed.', { database: databaseName, environment: 'e2e' })
    }
    process.exitCode = 1
    return
  }

  let shuttingDown = false
  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    let cleanupFailed = false
    try {
      const closed = new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
      server.closeAllConnections()
      await closed
    } catch {
      cleanupFailed = true
      console.error('[Server] E2E HTTP server cleanup failed.', { database: databaseName, environment: 'e2e' })
    }
    try {
      await closeSessionStore()
    } catch {
      cleanupFailed = true
      console.error('[Server] E2E session-store cleanup failed.', { database: databaseName, environment: 'e2e' })
    }
    try {
      await disconnectDatabase()
    } catch {
      cleanupFailed = true
      console.error('[Server] E2E database cleanup failed.', { database: databaseName, environment: 'e2e' })
    }
    if (cleanupFailed) {
      process.exitCode = 1
    } else {
      console.info('[Server] E2E API stopped.', { signal, database: databaseName, environment: 'e2e' })
    }
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}

await startE2EServer()
