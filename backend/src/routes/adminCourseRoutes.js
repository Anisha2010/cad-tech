import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listAdminCourses, createAdminCourse, getAdminCourse, updateAdminCourse, updateAdminCourseStatus, deleteAdminCourse, listAdminInstructors } from '../controllers/adminCourseController.js'
import {
  archiveAdminLesson,
  archiveAdminSection,
  createAdminLesson,
  createAdminSection,
  getAdminCourseCurriculum,
  publishAdminCurriculum,
  reorderAdminLessons,
  reorderAdminSections,
  updateAdminLesson,
  updateAdminSection
} from '../controllers/adminCurriculumController.js'
import { approveReview, assignAdminCourseInstructor, requestReviewChanges } from '../controllers/adminCourseController.js'

const router = express.Router()
const attempts = new Map()
const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 30) {
    return res.status(429).json({ success: false, message: 'Too many admin course updates. Please try again later.' })
  }
  recent.push(now)
  attempts.set(key, recent)
  next()
}

router.use(requireAuthentication, allowRoles('admin'))
router.get('/', listAdminCourses)
router.post('/', rateLimit, createAdminCourse)
router.get('/:courseId/curriculum', getAdminCourseCurriculum)
router.post('/:courseId/curriculum/sections', createAdminSection)
router.patch('/:courseId/curriculum/sections/:sectionId', updateAdminSection)
router.delete('/:courseId/curriculum/sections/:sectionId', archiveAdminSection)
router.patch('/:courseId/curriculum/sections/reorder', reorderAdminSections)
router.post('/:courseId/curriculum/sections/:sectionId/lessons', createAdminLesson)
router.patch('/:courseId/curriculum/sections/:sectionId/lessons/:lessonId', updateAdminLesson)
router.delete('/:courseId/curriculum/sections/:sectionId/lessons/:lessonId', archiveAdminLesson)
router.patch('/:courseId/curriculum/sections/:sectionId/lessons/reorder', reorderAdminLessons)
router.patch('/:courseId/curriculum/publish', publishAdminCurriculum)
router.get('/:courseId', getAdminCourse)
router.patch('/:courseId', rateLimit, updateAdminCourse)
router.patch('/:courseId/status', rateLimit, updateAdminCourseStatus)
router.patch('/:courseId/instructor', rateLimit, assignAdminCourseInstructor)
router.post('/:courseId/review/approve', rateLimit, approveReview)
router.post('/:courseId/review/request-changes', rateLimit, requestReviewChanges)
router.delete('/:courseId', rateLimit, deleteAdminCourse)

export default router
