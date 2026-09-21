import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import {
  listAssessments,
  getQuizReview,
  getAssignmentReview,
  approveQuizReview,
  requestQuizChanges,
  publishQuiz,
  unpublishQuiz,
  archiveQuizAdmin,
  approveAssignmentReview,
  requestAssignmentChanges,
  publishAssignment,
  unpublishAssignment,
  archiveAssignmentAdmin
} from '../controllers/adminAssessmentController.js'

const router = express.Router()
router.use(requireAuthentication, allowRoles('admin'))

router.get('/assessments', listAssessments)
router.get('/quizzes/:quizId', getQuizReview)
router.get('/assignments/:assignmentId', getAssignmentReview)
router.post('/quizzes/:quizId/review/approve', approveQuizReview)
router.post('/quizzes/:quizId/review/request-changes', requestQuizChanges)
router.post('/quizzes/:quizId/publish', publishQuiz)
router.post('/quizzes/:quizId/unpublish', unpublishQuiz)
router.delete('/quizzes/:quizId', archiveQuizAdmin)
router.post('/assignments/:assignmentId/review/approve', approveAssignmentReview)
router.post('/assignments/:assignmentId/review/request-changes', requestAssignmentChanges)
router.post('/assignments/:assignmentId/publish', publishAssignment)
router.post('/assignments/:assignmentId/unpublish', unpublishAssignment)
router.delete('/assignments/:assignmentId', archiveAssignmentAdmin)

export default router
