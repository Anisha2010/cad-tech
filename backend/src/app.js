/**
 * Express Application Configuration
 * Configures middleware, routes, and error handling
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import corsConfig from './config/cors.js'
import { createSessionMiddleware } from './config/session.js'
import { createApiLimiter } from './config/rateLimit.js'
import { registerRoutes } from './routes/index.js'
import studentRoutes from './routes/studentRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import cadPaymentRoutes from './routes/cadPaymentRoutes.js'
import { notFoundMiddleware } from './middleware/notFound.js'
import { errorHandlerMiddleware } from './middleware/errorHandler.js'
import { getDatabaseName, getDatabaseStatus } from './config/database.js'
import config from './config/environment.js'
import { configureCloudinary } from './config/storage.js'
import { verifyCadOrderReservationIndexes } from './utils/cadOrderReservationIndexes.js'
import { CadOrder } from './models/CadOrder.js'
import { mockEmailProvider } from './services/emailProvider.js'
import { createDevEmailPreviewRouter, isDevEmailPreviewEnabled } from './routes/devEmailPreviewRoutes.js'

const app = express()
configureCloudinary()
const isProduction = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')

if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' }
}))
app.use(createApiLimiter())

// CORS middleware
app.use(cors(corsConfig))

// Body parsing middleware
app.use('/payments/webhook', express.raw({ type: 'application/json' }))
app.use('/cad-payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true }))

if (isDevEmailPreviewEnabled(config)) {
  app.use('/__dev/email-preview', createDevEmailPreviewRouter({
    nodeEnv: config.node_env,
    provider: mockEmailProvider
  }))
}

app.get('/health', (req, res) => {
  const database = getDatabaseStatus()
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'unavailable',
    service: 'CadTech API',
    database: getDatabaseName() || null,
    databaseStatus: database
  })
})

app.get('/ready', async (req, res) => {
  const database = getDatabaseStatus()
  if (database !== 'connected') {
    res.status(503).json({
      status: 'not_ready',
      database: null,
      databaseStatus: database,
      cadOrderReservationIndexes: 'not_checked'
    })
    return
  }

  try {
    await verifyCadOrderReservationIndexes(CadOrder.collection)
    res.status(200).json({
      status: 'ready',
      database: getDatabaseName(),
      databaseStatus: 'connected',
      cadOrderReservationIndexes: 'valid'
    })
  } catch {
    res.status(503).json({
      status: 'not_ready',
      database: getDatabaseName(),
      databaseStatus: 'connected',
      cadOrderReservationIndexes: 'invalid'
    })
  }
})

// Session middleware
app.use(createSessionMiddleware())

// Register all routes
registerRoutes(app)
app.use('/student', studentRoutes)
app.use('/payments', paymentRoutes)
app.use('/cad-payments', cadPaymentRoutes)

// 404 Not Found middleware (must be after routes)
app.use(notFoundMiddleware)

// Error handler middleware (must be last)
app.use(errorHandlerMiddleware)

export default app
