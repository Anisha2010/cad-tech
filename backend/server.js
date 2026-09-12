/**
 * Server Entry Point
 * Handles server startup and graceful shutdown
 * Keeps business logic minimal
 */
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from './src/config/database.js'
import config from './src/config/environment.js'

const PORT = config.port
const NODE_ENV = config.node_env

const startServer = async () => {
  try {
    // Initialize database
    await connectDatabase()

    const { default: app } = await import('./src/app.js')

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`✓ CadTech auth server listening on port ${PORT}`)
      console.log(`✓ Environment: ${NODE_ENV}`)
    })

    // Handle graceful shutdown
    let shuttingDown = false
    const shutdown = async (signal) => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`\n✓ ${signal} received. Closing server gracefully...`)

      server.close(async () => {
        await disconnectDatabase()
        console.log('✓ Server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown (timeout)')
        process.exit(1)
      }, 10000)
    }

    process.once('SIGTERM', () => shutdown('SIGTERM'))
    process.once('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    console.error('✗ Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
