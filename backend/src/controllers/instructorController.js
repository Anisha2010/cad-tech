import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { getInstructorDashboard, listInstructorCourses, getInstructorCourse, updateInstructorCourse, submitCourseForReview, getAssignableInstructors } from '../services/instructorService.js'
import { CourseCurriculum, serializeCourseCurriculum } from '../models/CourseCurriculum.js'
import { Course } from '../models/Course.js'
import {
  createSection as createCurriculumSection,
  updateSection as updateCurriculumSection,
  archiveSection as archiveCurriculumSection,
  reorderSections as reorderCurriculumSections,
  createLesson as createCurriculumLesson,
  updateLesson as updateCurriculumLesson,
  archiveLesson as archiveCurriculumLesson,
  reorderLessons as reorderCurriculumLessons
} from '../services/adminCurriculumService.js'

export const dashboard = asyncHandler(async (req, res) => {
  const data = await getInstructorDashboard({ instructorId: req.user.id })
  return sendSuccess(res, data, 'Instructor dashboard retrieved successfully.')
})

export const listCourses = asyncHandler(async (req, res) => {
  const data = await listInstructorCourses({
    instructorId: req.user.id,
    search: typeof req.query.search === 'string' ? req.query.search : '',
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    reviewStatus: typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : 'all'
  })
  return sendSuccess(res, data, 'Assigned courses retrieved successfully.')
})

export const getOneCourse = asyncHandler(async (req, res) => {
  const course = await getInstructorCourse({ instructorId: req.user.id, courseId: req.params.courseId })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course retrieved successfully.')
})

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await updateInstructorCourse({ instructorId: req.user.id, courseId: req.params.courseId, payload: req.body || {} })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course updated successfully.')
})

export const submitReview = asyncHandler(async (req, res) => {
  const course = await submitCourseForReview({ instructorId: req.user.id, courseId: req.params.courseId })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course submitted for admin review.')
})

export const getAssignedInstructors = asyncHandler(async (req, res) => {
  const instructors = await getAssignableInstructors()
  return sendSuccess(res, { instructors }, 'Instructor options retrieved successfully.')
})

export const getCurriculum = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)

  const curriculum = await CourseCurriculum.findOne({ courseId: course._id }).lean()
  return sendSuccess(res, { course: { id: String(course._id), title: course.title }, curriculum: curriculum ? serializeCourseCurriculum(curriculum) : { sections: [] } }, 'Curriculum retrieved successfully.')
})

export const createSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await createCurriculumSection({ courseId: req.params.courseId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Section created successfully.', 201)
})

export const updateSectionById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await updateCurriculumSection({ courseId: req.params.courseId, sectionId: req.params.sectionId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Section updated successfully.')
})

export const deleteSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await archiveCurriculumSection({ courseId: req.params.courseId, sectionId: req.params.sectionId })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { archived: true }, 'Section archived successfully.')
})

export const reorderSectionsByIds = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await reorderCurriculumSections({ courseId: req.params.courseId, orderedSectionIds: req.body?.orderedSectionIds || [] })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Sections reordered successfully.')
})

export const createLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await createCurriculumLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lesson created successfully.', 201)
})

export const updateLessonById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await updateCurriculumLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, lessonId: req.params.lessonId, payload: req.body || {} })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lesson updated successfully.')
})

export const deleteLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await archiveCurriculumLesson({ courseId: req.params.courseId, sectionId: req.params.sectionId, lessonId: req.params.lessonId })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { archived: true }, 'Lesson archived successfully.')
})

export const reorderLessonsByIds = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).lean()
  if (!course) return sendError(res, 'Course not found.', 404)
  if (String(course.instructorId || '') !== String(req.user.id)) return sendError(res, 'You are not assigned to this course.', 403)
  const result = await reorderCurriculumLessons({ courseId: req.params.courseId, sectionId: req.params.sectionId, orderedLessonIds: req.body?.orderedLessonIds || [] })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { curriculum: result }, 'Lessons reordered successfully.')
})

export default {
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
}
