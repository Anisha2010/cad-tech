import express from 'express'
import { createOrder, verifyPayment, webhook } from '../controllers/paymentController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'

const router = express.Router()
const attempts = new Map()
const limit = (req, res, next) => { const key = `${req.ip}:${req.user?.id || 'anonymous'}`; const now = Date.now(); const recent = (attempts.get(key) || []).filter((time) => now - time < 60000); if (recent.length >= 10) return res.status(429).json({ success: false, message: 'Too many payment attempts. Please try again later.' }); recent.push(now); attempts.set(key, recent); next() }

router.post('/orders', requireAuthentication, allowRoles('student'), limit, createOrder)
router.post('/verify', requireAuthentication, allowRoles('student'), limit, verifyPayment)
router.post('/webhook', webhook)

export default router