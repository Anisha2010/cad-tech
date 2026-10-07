import express from 'express'
import { allowRoles } from '../middleware/authorization.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { requireAssignedInstructor } from '../middleware/instructorAccess.js'
import { uploadCourseMedia } from '../controllers/courseMediaController.js'
import {
  dashboard,
  listCourses,
  getOneCourse,
  updateCourse,
  submitReview,
  getAssignedInstructors,
  getCurriculum,
  createSection,
  updateSectionById,
  deleteSection,
  reorderSectionsByIds,
  createLesson,
  updateLessonById,
  deleteLesson,
  reorderLessonsByIds
} from '../controllers/instructorController.js'
import {
  listCourseSubmissions,
  getInstructorSubmission,
  gradeSubmission,
  requestSubmissionResubmission
} from '../controllers/instructorSubmissionController.js'

const router = express.Router()

router.use(requireAuthentication, allowRoles('instructor'))

router.get('/dashboard', dashboard)
router.get('/courses', listCourses)
router.get('/options', getAssignedInstructors)
router.get('/courses/:courseId', requireAssignedInstructor, getOneCourse)
router.post('/courses/:courseId/media/:kind', requireAssignedInstructor, uploadCourseMedia)
router.patch('/courses/:courseId', requireAssignedInstructor, updateCourse)
router.post('/courses/:courseId/submit-review', requireAssignedInstructor, submitReview)

router.get('/courses/:courseId/curriculum', requireAssignedInstructor, getCurriculum)
router.post('/courses/:courseId/curriculum/sections', requireAssignedInstructor, createSection)
router.patch('/courses/:courseId/curriculum/sections/:sectionId', requireAssignedInstructor, updateSectionById)
router.delete('/courses/:courseId/curriculum/sections/:sectionId', requireAssignedInstructor, deleteSection)
router.patch('/courses/:courseId/curriculum/sections/reorder', requireAssignedInstructor, reorderSectionsByIds)
router.post('/courses/:courseId/curriculum/sections/:sectionId/lessons', requireAssignedInstructor, createLesson)
router.patch('/courses/:courseId/curriculum/sections/:sectionId/lessons/:lessonId', requireAssignedInstructor, updateLessonById)
router.delete('/courses/:courseId/curriculum/sections/:sectionId/lessons/:lessonId', requireAssignedInstructor, deleteLesson)
router.patch('/courses/:courseId/curriculum/sections/:sectionId/lessons/reorder', requireAssignedInstructor, reorderLessonsByIds)
router.get('/courses/:courseId/submissions', requireAssignedInstructor, listCourseSubmissions)
router.get('/submissions/:submissionId', requireAssignedInstructor, getInstructorSubmission)
router.post('/submissions/:submissionId/grade', requireAssignedInstructor, gradeSubmission)
router.post('/submissions/:submissionId/request-resubmission', requireAssignedInstructor, requestSubmissionResubmission)

export default router
