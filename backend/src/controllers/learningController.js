import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { getStudentLearningView as getStudentLearningViewService, updateLessonPosition, updateLessonProgress } from '../services/learningService.js'

export const getStudentLearningView = asyncHandler(async (req, res) => {
  const result = await getStudentLearningViewService({ userId: req.user.id, courseSlug: req.params.courseSlug })
  if (!result) return sendError(res, 'Course not found or enrollment not active.', 404)
  return sendSuccess(res, result, 'Learning content retrieved successfully.')
})

export const updateStudentLessonProgress = asyncHandler(async (req, res) => {
  const result = await updateLessonProgress({
    userId: req.user.id,
    courseSlug: req.params.courseSlug,
    lessonId: req.params.lessonId,
    payload: req.body || {}
  })

  if (!result) return sendError(res, 'Course not found or enrollment not active.', 404)
  if (result.error) return sendError(res, result.error, 404)
  return sendSuccess(res, result, 'Lesson progress updated successfully.')
})

export const updateStudentLessonPosition = asyncHandler(async (req, res) => {
  const result = await updateLessonPosition({
    userId: req.user.id,
    courseSlug: req.params.courseSlug,
    lessonId: req.params.lessonId,
    payload: req.body || {}
  })

  if (!result) return sendError(res, 'Course not found or enrollment not active.', 404)
  if (result.error) return sendError(res, result.error, 404)
  return sendSuccess(res, result, 'Lesson position updated successfully.')
})

export default {
  getStudentLearningView,
  updateStudentLessonProgress,
  updateStudentLessonPosition
}
