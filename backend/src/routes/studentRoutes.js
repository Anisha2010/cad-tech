import express from 'express'
import { getStudentDashboard } from '../controllers/studentController.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listEnrollments } from '../controllers/enrollmentController.js'
import { listStudentPayments } from '../controllers/paymentController.js'
import { getStudentLearningView, updateStudentLessonProgress, updateStudentLessonPosition } from '../controllers/learningController.js'
import { startQuizAttempt, getQuizAttempt, saveQuizAnswer, submitQuizAttempt, getQuizResult, getQuizHistory } from '../controllers/studentQuizController.js'
import {
  getStudentAssignment,
  createStudentSubmissionDraft,
  updateStudentSubmission,
  uploadStudentSubmissionAttachment,
  removeStudentSubmissionAttachment,
  submitStudentSubmission,
  listStudentSubmissions,
  getStudentSubmissionDetail
} from '../controllers/assignmentSubmissionController.js'
import { listMyCadDownloads, checkCadProductAccess, requestCadDownloadByProduct } from '../controllers/cadDownloadEntitlementController.js'
import { createQuizAnswerLimiter, createQuizStartLimiter, createQuizSubmitLimiter } from '../config/rateLimit.js'

const router = express.Router()
const quizStartLimiter = createQuizStartLimiter()
const quizAnswerLimiter = createQuizAnswerLimiter()
const quizSubmitLimiter = createQuizSubmitLimiter()

router.get('/dashboard', requireAuthentication, allowRoles('student'), getStudentDashboard)
router.get('/enrollments', requireAuthentication, allowRoles('student'), listEnrollments)
router.get('/payments', requireAuthentication, allowRoles('student'), listStudentPayments)
router.get('/learning/:courseSlug', requireAuthentication, allowRoles('student'), getStudentLearningView)
router.put('/learning/:courseSlug/lessons/:lessonId/progress', requireAuthentication, allowRoles('student'), updateStudentLessonProgress)
router.put('/learning/:courseSlug/lessons/:lessonId/position', requireAuthentication, allowRoles('student'), updateStudentLessonPosition)
router.post('/quizzes/:quizId/attempts', requireAuthentication, allowRoles('student'), quizStartLimiter, startQuizAttempt)
router.get('/quiz-attempts/:attemptId', requireAuthentication, allowRoles('student'), getQuizAttempt)
router.patch('/quiz-attempts/:attemptId/answers', requireAuthentication, allowRoles('student'), quizAnswerLimiter, saveQuizAnswer)
router.post('/quiz-attempts/:attemptId/submit', requireAuthentication, allowRoles('student'), quizSubmitLimiter, submitQuizAttempt)
router.get('/quizzes/:quizId/results/:attemptId', requireAuthentication, allowRoles('student'), getQuizResult)
router.get('/quiz-history', requireAuthentication, allowRoles('student'), getQuizHistory)
router.get('/assignments/:assignmentId', requireAuthentication, allowRoles('student'), getStudentAssignment)
router.post('/assignments/:assignmentId/submissions', requireAuthentication, allowRoles('student'), createStudentSubmissionDraft)
router.patch('/submissions/:submissionId', requireAuthentication, allowRoles('student'), updateStudentSubmission)
router.post('/submissions/:submissionId/attachments', requireAuthentication, allowRoles('student'), uploadStudentSubmissionAttachment)
router.delete('/submissions/:submissionId/attachments/:attachmentId', requireAuthentication, allowRoles('student'), removeStudentSubmissionAttachment)
router.post('/submissions/:submissionId/submit', requireAuthentication, allowRoles('student'), submitStudentSubmission)
router.get('/submissions', requireAuthentication, allowRoles('student'), listStudentSubmissions)
router.get('/submissions/:submissionId', requireAuthentication, allowRoles('student'), getStudentSubmissionDetail)
router.get('/downloads', requireAuthentication, allowRoles('student'), listMyCadDownloads)
router.get('/cad-downloads', requireAuthentication, allowRoles('student'), listMyCadDownloads)
router.get('/cad-products/:productId/access', requireAuthentication, allowRoles('student'), checkCadProductAccess)
router.post('/cad-products/:productId/access', requireAuthentication, allowRoles('student'), checkCadProductAccess)
router.get('/cad-products/:productId/download', requireAuthentication, allowRoles('student'), requestCadDownloadByProduct)
router.post('/cad-products/:productId/download', requireAuthentication, allowRoles('student'), requestCadDownloadByProduct)
router.post('/cad-products/:productId/claim', requireAuthentication, allowRoles('student'), async (req, res, next) => {
  try {
    const { claimCadProductAccess } = await import('../controllers/cadDownloadEntitlementController.js')
    return claimCadProductAccess(req, res, next)
  } catch (error) { next(error) }
})

export default router