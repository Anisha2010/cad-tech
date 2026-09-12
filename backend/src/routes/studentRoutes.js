import express from 'express'
import { getStudentDashboard } from '../controllers/studentController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listEnrollments } from '../controllers/enrollmentController.js'
import { listStudentPayments } from '../controllers/paymentController.js'
import { getStudentLearningViewController as getStudentLearningView, updateStudentLessonProgress, updateStudentLessonPosition } from '../controllers/learningController.js'

const router = express.Router()

router.get('/dashboard', requireAuthentication, allowRoles('student'), getStudentDashboard)
router.get('/enrollments', requireAuthentication, allowRoles('student'), listEnrollments)
router.get('/payments', requireAuthentication, allowRoles('student'), listStudentPayments)
router.get('/learning/:courseSlug', requireAuthentication, allowRoles('student'), getStudentLearningView)
router.put('/learning/:courseSlug/lessons/:lessonId/progress', requireAuthentication, allowRoles('student'), updateStudentLessonProgress)
router.put('/learning/:courseSlug/lessons/:lessonId/position', requireAuthentication, allowRoles('student'), updateStudentLessonPosition)

export default router