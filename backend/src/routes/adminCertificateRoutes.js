import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listAdminCertificates, getAdminCertificate, revokeAdminCertificate, reissueAdminCertificate } from '../controllers/adminCertificateController.js'

const router = express.Router()
const attempts = new Map()
const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 20) return res.status(429).json({ success: false, message: 'Too many admin certificate requests. Please try again later.' })
  recent.push(now)
  attempts.set(key, recent)
  next()
}

router.use(requireAuthentication, allowRoles('admin'))
router.get('/certificates', rateLimit, listAdminCertificates)
router.get('/certificates/:certificateId', rateLimit, getAdminCertificate)
router.patch('/certificates/:certificateId/revoke', rateLimit, revokeAdminCertificate)
router.post('/certificates/:certificateId/reissue', rateLimit, reissueAdminCertificate)

export default router
