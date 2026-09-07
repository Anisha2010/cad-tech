/**
 * Routes index
 * Aggregates all route modules
 */
import authRoutes from './authRoutes.js'

export const registerRoutes = (app) => {
  app.use('/auth', authRoutes)
}

export default registerRoutes
