import express from 'express'
import { createCadOrder, getCadOrder, listAdminCadOrders, listStudentCadOrders, verifyCadPayment, webhook } from '../controllers/cadOrderController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'

const router = express.Router()
const attempts = new Map()
const limit = (req, res, next) => { const key = `${req.ip}:${req.user?.id || 'anonymous'}`; const now = Date.now(); const recent = (attempts.get(key) || []).filter((time) => now - time < 60000); if (recent.length >= 10) return res.status(429).json({ success: false, message: 'Too many CAD payment attempts. Please try again later.' }); recent.push(now); attempts.set(key, recent); next() }

router.get('/orders', requireAuthentication, allowRoles('student'), listStudentCadOrders)
router.get('/orders/:orderId', requireAuthentication, allowRoles('student'), getCadOrder)
router.post('/orders', requireAuthentication, allowRoles('student'), limit, createCadOrder)
router.post('/verify', requireAuthentication, allowRoles('student'), limit, verifyCadPayment)
router.post('/webhook', webhook)

export default router
