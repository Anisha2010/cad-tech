/**
 * Routes index
 * Aggregates all route modules
 */
import authRoutes from './authRoutes.js'
import courseRoutes from './courseRoutes.js'
import adminCourseRoutes from './adminCourseRoutes.js'

export const registerRoutes = (app) => {
  app.use('/auth', authRoutes)
  app.use('/courses', courseRoutes)
  app.use('/admin/courses', adminCourseRoutes)
}

export default registerRoutes
