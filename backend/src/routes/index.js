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
import studentCertificateRoutes from './studentCertificateRoutes.js'
import adminCertificateRoutes from './adminCertificateRoutes.js'
import adminUserRoutes from './adminUserRoutes.js'
import publicCertificateRoutes from './publicCertificateRoutes.js'
import siteContentRoutes from './siteContentRoutes.js'

export const registerRoutes = (app) => {
  app.use('/auth', authRoutes)
  app.use('/courses', courseRoutes)
  app.use('/admin/courses', adminCourseRoutes)
  app.use('/admin', adminRoutes)
  app.use('/admin', adminAssessmentRoutes)
  app.use('/admin', adminCertificateRoutes)
  app.use('/admin/users', adminUserRoutes)
  app.use('/instructor', instructorRoutes)
  app.use('/instructor', instructorAssessmentRoutes)
  app.use('/student', studentCertificateRoutes)
  app.use('/', siteContentRoutes)
  app.use('/', publicCertificateRoutes)
  app.use('/', cadRoutes)
}

export default registerRoutes
