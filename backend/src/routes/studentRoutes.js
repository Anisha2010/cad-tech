import express from 'express'
import { getStudentDashboard } from '../controllers/studentController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listEnrollments } from '../controllers/enrollmentController.js'
import { listStudentPayments } from '../controllers/paymentController.js'
import { getStudentLearningView, updateStudentLessonProgress, updateStudentLessonPosition } from '../controllers/learningController.js'
import { startQuizAttempt, getQuizAttempt, saveQuizAnswer, submitQuizAttempt, getQuizResult, getQuizHistory } from '../controllers/studentQuizController.js'

const router = express.Router()

router.get('/dashboard', requireAuthentication, allowRoles('student'), getStudentDashboard)
router.get('/enrollments', requireAuthentication, allowRoles('student'), listEnrollments)
router.get('/payments', requireAuthentication, allowRoles('student'), listStudentPayments)
router.get('/learning/:courseSlug', requireAuthentication, allowRoles('student'), getStudentLearningView)
router.put('/learning/:courseSlug/lessons/:lessonId/progress', requireAuthentication, allowRoles('student'), updateStudentLessonProgress)
router.put('/learning/:courseSlug/lessons/:lessonId/position', requireAuthentication, allowRoles('student'), updateStudentLessonPosition)
router.post('/quizzes/:quizId/attempts', requireAuthentication, allowRoles('student'), startQuizAttempt)
router.get('/quiz-attempts/:attemptId', requireAuthentication, allowRoles('student'), getQuizAttempt)
router.patch('/quiz-attempts/:attemptId/answers', requireAuthentication, allowRoles('student'), saveQuizAnswer)
router.post('/quiz-attempts/:attemptId/submit', requireAuthentication, allowRoles('student'), submitQuizAttempt)
router.get('/quizzes/:quizId/results/:attemptId', requireAuthentication, allowRoles('student'), getQuizResult)
router.get('/quiz-history', requireAuthentication, allowRoles('student'), getQuizHistory)

export default router