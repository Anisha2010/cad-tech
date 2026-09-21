import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import {
  archiveLesson,
  archiveSection,
  createLesson,
  createSection,
  getAdminCurriculum,
  publishCurriculum,
  reorderLessons,
  reorderSections,
  updateLesson,
  updateSection
} from '../services/adminCurriculumService.js'

export const getAdminCourseCurriculum = asyncHandler(async (req, res) => {
  const result = await getAdminCurriculum({ courseId: req.params.courseId })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, result, 'Curriculum retrieved successfully.')
})

export const createAdminSection = asyncHandler(async (req, res) => {
  const result = await createSection({ courseId: req.params.courseId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Section created successfully.', 201)
})

export const updateAdminSection = asyncHandler(async (req, res) => {
  const result = await updateSection({ courseId: req.params.courseId, sectionId: req.params.sectionId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Section updated successfully.')
})

export const archiveAdminSection = asyncHandler(async (req, res) => {
  const result = await archiveSection({ courseId: req.params.courseId, sectionId: req.params.sectionId })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { archived: true, sectionId: req.params.sectionId }, 'Section archived successfully. The section and its lessons are hidden from students.')
})

export const reorderAdminSections = asyncHandler(async (req, res) => {
  const result = await reorderSections({ courseId: req.params.courseId, orderedSectionIds: req.body?.orderedSectionIds || [] })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Sections reordered successfully.')
})

export const createAdminLesson = asyncHandler(async (req, res) => {
  const result = await createLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lesson created successfully.', 201)
})

export const updateAdminLesson = asyncHandler(async (req, res) => {
  const result = await updateLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, lessonId: req.params.lessonId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lesson updated successfully.')
})

export const archiveAdminLesson = asyncHandler(async (req, res) => {
  const result = await archiveLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, lessonId: req.params.lessonId })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { archived: true, lessonId: req.params.lessonId }, 'Lesson archived successfully. Existing progress history is preserved.')
})

export const reorderAdminLessons = asyncHandler(async (req, res) => {
  const result = await reorderLessons({ courseId: req.params.courseId, sectionId: req.params.sectionId, orderedLessonIds: req.body?.orderedLessonIds || [] })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lessons reordered successfully.')
})

export const publishAdminCurriculum = asyncHandler(async (req, res) => {
  const result = await publishCurriculum({ courseId: req.params.courseId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, result.isPublished ? 'Curriculum published successfully.' : 'Curriculum moved back to draft.')
})

export default {
  getAdminCourseCurriculum,
  createAdminSection,
  updateAdminSection,
  archiveAdminSection,
  reorderAdminSections,
  createAdminLesson,
  updateAdminLesson,
  archiveAdminLesson,
  reorderAdminLessons,
  publishAdminCurriculum
}
