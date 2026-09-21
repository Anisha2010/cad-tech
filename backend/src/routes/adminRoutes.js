import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { getDashboard } from '../controllers/adminDashboardController.js'
import { listAdminInstructors } from '../controllers/adminCourseController.js'

const router = express.Router()
const dashboardAttempts = new Map()
const limitDashboardRequests = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (dashboardAttempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 60) return res.status(429).json({ success: false, message: 'Too many dashboard requests. Please try again later.' })
  recent.push(now)
  dashboardAttempts.set(key, recent)
  next()
}

router.get('/dashboard', requireAuthentication, allowRoles('admin'), limitDashboardRequests, getDashboard)
router.get('/instructors', requireAuthentication, allowRoles('admin'), listAdminInstructors)

export default router