/**
 * Express Application Configuration
 * Configures middleware, routes, and error handling
 */
import express from 'express'
import cors from 'cors'
import corsConfig from './config/cors.js'
import { createSessionMiddleware } from './config/session.js'
import { registerRoutes } from './routes/index.js'
import studentRoutes from './routes/studentRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import { notFoundMiddleware } from './middleware/notFound.js'
import { errorHandlerMiddleware } from './middleware/errorHandler.js'

const app = express()
const isProduction = process.env.NODE_ENV === 'production'

// Disable x-powered-by header for security
app.disable('x-powered-by')

if (isProduction) {
	app.set('trust proxy', 1)
}

// CORS middleware
app.use(cors(corsConfig))

// Body parsing middleware
app.use('/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok', service: 'CadTech API' })
})

// Session middleware
app.use(createSessionMiddleware())

// Register all routes
registerRoutes(app)
app.use('/student', studentRoutes)
app.use('/payments', paymentRoutes)

// 404 Not Found middleware (must be after routes)
app.use(notFoundMiddleware)

// Error handler middleware (must be last)
app.use(errorHandlerMiddleware)

export default app
