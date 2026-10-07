import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { getStudentCourseCompletion, issueStudentCertificate, listStudentCertificates, getStudentCertificate, downloadStudentCertificate } from '../controllers/studentCertificateController.js'

const router = express.Router()
const attempts = new Map()
const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 30) return res.status(429).json({ success: false, message: 'Too many certificate requests. Please try again later.' })
  recent.push(now)
  attempts.set(key, recent)
  next()
}

router.use(requireAuthentication, allowRoles('student'))
router.get('/courses/:courseId/completion', rateLimit, getStudentCourseCompletion)
router.post('/courses/:courseId/certificate', rateLimit, issueStudentCertificate)
router.get('/certificates', listStudentCertificates)
router.get('/certificates/:certificateId', getStudentCertificate)
router.get('/certificates/:certificateId/download', rateLimit, downloadStudentCertificate)

export default router
