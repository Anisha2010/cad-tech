import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { requireAssignedInstructor } from '../middleware/instructorAccess.js'
import {
  listCourseAssessments,
  createQuiz,
  getQuiz,
  updateQuiz,
  addQuizQuestion,
  updateQuizQuestion,
  reorderQuizQuestions,
  archiveQuizQuestion,
  submitQuizForReview,
  archiveQuiz,
  createAssignment,
  getAssignment,
  updateAssignment,
  submitAssignmentForReview,
  archiveAssignment
} from '../controllers/instructorAssessmentController.js'

const router = express.Router()

router.use(requireAuthentication, allowRoles('instructor'))
router.get('/courses/:courseId/assessments', requireAssignedInstructor, listCourseAssessments)
router.post('/courses/:courseId/quizzes', requireAssignedInstructor, createQuiz)
router.get('/courses/:courseId/quizzes/:quizId', requireAssignedInstructor, getQuiz)
router.patch('/courses/:courseId/quizzes/:quizId', requireAssignedInstructor, updateQuiz)
router.post('/courses/:courseId/quizzes/:quizId/questions', requireAssignedInstructor, addQuizQuestion)
router.patch('/courses/:courseId/quizzes/:quizId/questions/:questionId', requireAssignedInstructor, updateQuizQuestion)
router.patch('/courses/:courseId/quizzes/:quizId/questions/reorder', requireAssignedInstructor, reorderQuizQuestions)
router.delete('/courses/:courseId/quizzes/:quizId/questions/:questionId', requireAssignedInstructor, archiveQuizQuestion)
router.post('/courses/:courseId/quizzes/:quizId/submit-review', requireAssignedInstructor, submitQuizForReview)
router.delete('/courses/:courseId/quizzes/:quizId', requireAssignedInstructor, archiveQuiz)
router.post('/courses/:courseId/assignments', requireAssignedInstructor, createAssignment)
router.get('/courses/:courseId/assignments/:assignmentId', requireAssignedInstructor, getAssignment)
router.patch('/courses/:courseId/assignments/:assignmentId', requireAssignedInstructor, updateAssignment)
router.post('/courses/:courseId/assignments/:assignmentId/submit-review', requireAssignedInstructor, submitAssignmentForReview)
router.delete('/courses/:courseId/assignments/:assignmentId', requireAssignedInstructor, archiveAssignment)

export default router
