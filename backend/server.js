/**
 * Server Entry Point
 * Handles server startup and graceful shutdown
 * Keeps business logic minimal
 */
import { connectDatabase, disconnectDatabase } from './src/config/database.js'
import config from './src/config/environment.js'
import { CadOrder } from './src/models/CadOrder.js'
import { verifyCadOrderReservationIndexes } from './src/utils/cadOrderReservationIndexes.js'
import { closeSessionStore } from './src/config/session.js'

const PORT = config.port
let server
let shuttingDown = false

const listen = (app) => new Promise((resolve, reject) => {
  const httpServer = app.listen(PORT)
  httpServer.once('error', reject)
  httpServer.once('listening', () => resolve(httpServer))
})

const shutdown = async (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.info('[Server] Shutdown requested.', {
    database: config.mongodb_database || 'unconfigured',
    environment: config.environment_label,
    signal
  })

  let cleanupFailed = false
  if (server) {
    try {
      const closed = new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
      server.closeAllConnections()
      await closed
    } catch {
      cleanupFailed = true
      console.error('[Server] HTTP server cleanup failed.')
    }
  }
  try {
    await closeSessionStore()
  } catch {
    cleanupFailed = true
    console.error('[Server] Session-store cleanup failed.')
  }
  try {
    await disconnectDatabase()
  } catch {
    cleanupFailed = true
    console.error('[Server] Database cleanup failed.')
  }

  if (cleanupFailed) {
    process.exitCode = 1
  } else {
    console.info('[Server] Shutdown complete.', {
      database: config.mongodb_database || 'unconfigured',
      environment: config.environment_label
    })
  }
}

const startServer = async () => {
  try {
    await connectDatabase()
    await verifyCadOrderReservationIndexes(CadOrder.collection)

    const { default: app } = await import('./src/app.js')
    server = await listen(app)
    console.info('[Server] CadTech API listening.', {
      port: server.address().port,
      database: config.mongodb_database,
      environment: config.environment_label,
      emailProvider: config.email_provider
    })

    process.once('SIGTERM', () => shutdown('SIGTERM'))
    process.once('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    console.error('[Server] Startup failed.', {
      database: config.mongodb_database || 'unconfigured',
      environment: config.environment_label,
      message: error.message,
      ...(error.safeDetails ? { mongo: error.safeDetails } : {})
    })
    try {
      await closeSessionStore()
    } catch {
      console.error('[Server] Session-store cleanup failed.')
    }
    try {
      await disconnectDatabase()
    } catch {
      console.error('[Server] Database cleanup failed.')
    }
    process.exitCode = 1
  }
}

await startServer()
