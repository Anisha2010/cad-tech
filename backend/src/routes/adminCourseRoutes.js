import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listAdminCourses, createAdminCourse, getAdminCourse, updateAdminCourse, updateAdminCourseStatus, deleteAdminCourse } from '../controllers/adminCourseController.js'

const router = express.Router()
const attempts = new Map()
const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 30) {
    return res.status(429).json({ success: false, message: 'Too many admin course updates. Please try again later.' })
  }
  recent.push(now)
  attempts.set(key, recent)
  next()
}

router.use(requireAuthentication, allowRoles('admin'))
router.get('/', listAdminCourses)
router.post('/', rateLimit, createAdminCourse)
router.get('/:courseId', getAdminCourse)
router.patch('/:courseId', rateLimit, updateAdminCourse)
router.patch('/:courseId/status', rateLimit, updateAdminCourseStatus)
router.delete('/:courseId', rateLimit, deleteAdminCourse)

export default router
