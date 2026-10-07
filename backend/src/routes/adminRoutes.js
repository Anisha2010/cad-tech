import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { getDashboard, listAdminEnrollments, listAdminPayments } from '../controllers/adminDashboardController.js'
import { listAdminInstructors } from '../controllers/adminCourseController.js'
import { listAdminCadOrders } from '../controllers/cadOrderController.js'

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
router.get('/enrollments', requireAuthentication, allowRoles('admin'), listAdminEnrollments)
router.get('/payments', requireAuthentication, allowRoles('admin'), listAdminPayments)
router.get('/instructors', requireAuthentication, allowRoles('admin'), listAdminInstructors)
router.get('/cad-orders', requireAuthentication, allowRoles('admin'), listAdminCadOrders)

export default router