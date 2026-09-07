/**
 * Server Entry Point
 * Handles server startup and graceful shutdown
 * Keeps business logic minimal
 */
import 'dotenv/config'
import app from './src/app.js'
import { initializeDatabase } from './src/config/database.js'
import config from './src/config/environment.js'

const PORT = config.port
const NODE_ENV = config.node_env

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase()
    console.log('✓ Database initialized')

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`✓ CadTech auth server running on http://localhost:${PORT}`)
      console.log(`✓ Environment: ${NODE_ENV}`)
    })

    // Handle graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n✓ ${signal} received. Closing server gracefully...`)

      server.close(() => {
        console.log('✓ Server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown (timeout)')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    console.error('✗ Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
