/**
 * Routes index
 * Aggregates all route modules
 */
import authRoutes from './authRoutes.js'
import courseRoutes from './courseRoutes.js'
import adminCourseRoutes from './adminCourseRoutes.js'
import adminRoutes from './adminRoutes.js'
import adminAssessmentRoutes from './adminAssessmentRoutes.js'
import instructorRoutes from './instructorRoutes.js'
import instructorAssessmentRoutes from './instructorAssessmentRoutes.js'
import cadRoutes from './cadRoutes.js'

export const registerRoutes = (app) => {
  app.use('/auth', authRoutes)
  app.use('/courses', courseRoutes)
  app.use('/admin/courses', adminCourseRoutes)
  app.use('/admin', adminRoutes)
  app.use('/admin', adminAssessmentRoutes)
  app.use('/instructor', instructorRoutes)
  app.use('/instructor', instructorAssessmentRoutes)
  app.use('/', cadRoutes)
}

export default registerRoutes
