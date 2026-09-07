import express from 'express'
import { getStudentDashboard } from '../controllers/studentController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listEnrollments } from '../controllers/enrollmentController.js'

const router = express.Router()

router.get('/dashboard', requireAuthentication, allowRoles('student'), getStudentDashboard)
router.get('/enrollments', requireAuthentication, allowRoles('student'), listEnrollments)

export default router