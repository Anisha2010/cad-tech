import mongoose from 'mongoose'
import { Course, serializeCourse } from '../models/Course.js'
import { User } from '../models/User.js'
import { CourseCurriculum, serializeCourseCurriculum } from '../models/CourseCurriculum.js'
import { AppError } from '../utils/AppError.js'

const allowedEditableFields = new Set([
  'title',
  'shortDescription',
  'description',
  'category',
  'software',
  'level',
  'duration',
  'thumbnailUrl',
  'learningOutcomes',
  'requirements'
])

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const safeArrayText = (value) => Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 12) : []

export const sanitizeReviewFeedback = (value) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return null
  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > 2000 ? clean.slice(0, 2000) : clean
}

export const isInstructorAssignedToCourse = (course, instructorId) => {
  if (!course || !instructorId) return false
  return String(course.instructorId || '') === String(instructorId)
}

export const getInstructorDashboard = async ({ instructorId }) => {
  if (!mongoose.isValidObjectId(instructorId)) throw new AppError('Authentication required.', 401)

  const [courses, summary] = await Promise.all([
    Course.find({ instructorId }).sort({ updatedAt: -1 }).limit(5).lean(),
    Promise.all([
      Course.countDocuments({ instructorId }),
      Course.countDocuments({ instructorId, status: 'draft' }),
      Course.countDocuments({ instructorId, reviewStatus: 'pending' }),
      Course.countDocuments({ instructorId, status: 'published' })
    ])
  ])

  const instructor = await User.findById(instructorId).lean()

  return {
    instructor: {
      id: instructor ? String(instructor._id) : String(instructorId),
      name: instructor?.name || 'Instructor'
    },
    summary: {
      assignedCourses: summary[0],
      draftCourses: summary[1],
      pendingReview: summary[2],
      publishedCourses: summary[3]
    },
    recentCourses: courses.map(serializeCourse)
  }
}

export const listInstructorCourses = async ({ instructorId, search = '', status = 'all', reviewStatus = 'all' } = {}) => {
  if (!mongoose.isValidObjectId(instructorId)) return { courses: [], totalItems: 0, totalPages: 0 }

  const filter = { instructorId: new mongoose.Types.ObjectId(instructorId) }

  if (status && status !== 'all') filter.status = status
  if (reviewStatus && reviewStatus !== 'all') filter.reviewStatus = reviewStatus

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } },
      { software: { $regex: escaped, $options: 'i' } }
    ]
  }

  const courses = await Course.find(filter).sort({ updatedAt: -1 }).lean()
  return {
    courses: courses.map(serializeCourse),
    totalItems: courses.length,
    totalPages: courses.length ? 1 : 0
  }
}

export const getInstructorCourse = async ({ instructorId, courseId }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  if (String(course.instructorId || '') !== String(instructorId)) return null
  return serializeCourse(course)
}

export const updateInstructorCourse = async ({ instructorId, courseId, payload = {} }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)

  const lockedReasons = [
    course.status === 'archived',
    course.reviewStatus === 'pending',
    course.status === 'published' && course.reviewStatus !== 'changes_requested'
  ]

  if (lockedReasons.some(Boolean)) {
    throw new AppError('This course is currently read-only for instructors.', 409)
  }

  const updates = {}
  for (const key of Object.keys(payload || {})) {
    if (!allowedEditableFields.has(key)) continue
    if (key === 'title') updates.title = normalizeText(payload.title)
    if (key === 'shortDescription') updates.shortDescription = normalizeText(payload.shortDescription)
    if (key === 'description') updates.description = normalizeText(payload.description)
    if (key === 'category') updates.category = normalizeText(payload.category)
    if (key === 'software') updates.software = normalizeText(payload.software)
    if (key === 'level') updates.level = ['Beginner', 'Intermediate', 'Advanced'].includes(payload.level) ? payload.level : course.level
    if (key === 'duration') updates.duration = payload.duration === null || payload.duration === '' ? null : normalizeText(payload.duration)
    if (key === 'thumbnailUrl') updates.thumbnailUrl = payload.thumbnailUrl === '' || payload.thumbnailUrl === null ? null : normalizeText(payload.thumbnailUrl)
    if (key === 'learningOutcomes') updates.learningOutcomes = safeArrayText(payload.learningOutcomes)
    if (key === 'requirements') updates.requirements = safeArrayText(payload.requirements)
  }

  if (!updates.title && course.title) updates.title = course.title
  if (Object.keys(updates).length === 0) {
    return serializeCourse(course)
  }

  const nextCourse = await Course.findByIdAndUpdate(courseId, { $set: { ...updates, updatedBy: instructorId, reviewStatus: course.reviewStatus === 'changes_requested' ? 'changes_requested' : 'not_submitted' } }, { new: true, runValidators: true }).lean()
  return serializeCourse(nextCourse)
}

export const submitCourseForReview = async ({ instructorId, courseId }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  if (course.status === 'archived') throw new AppError('Archived courses cannot be submitted for review.', 409)
  if (course.reviewStatus === 'pending') throw new AppError('This course is already pending review.', 409)

  const curriculum = await CourseCurriculum.findOne({ courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  const sections = Array.isArray(curriculum?.sections) ? curriculum.sections.filter((section) => !section.archivedAt) : []
  const lessons = sections.flatMap((section) => (Array.isArray(section.lessons) ? section.lessons.filter((lesson) => !lesson.archivedAt) : []))

  if (!course.title?.trim() || !course.description?.trim()) throw new AppError('Course title and description are required before submitting for review.', 422)
  if (!sections.length) throw new AppError('At least one active section is required before submission.', 422)
  if (!lessons.length) throw new AppError('At least one valid lesson is required before submission.', 422)

  const invalidLesson = lessons.find((lesson) => {
    if (lesson.type === 'video' && !lesson.videoUrl) return true
    if (lesson.type === 'article' && !lesson.articleContent) return true
    if (lesson.type === 'pdf' && !lesson.pdfUrl) return true
    return false
  })
  if (invalidLesson) throw new AppError('One or more lessons are incomplete.', 422)

  const updated = await Course.findByIdAndUpdate(courseId, {
    $set: {
      reviewStatus: 'pending',
      submittedForReviewAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewFeedback: null,
      updatedBy: instructorId
    }
  }, { new: true }).lean()

  return serializeCourse(updated)
}

export const assignInstructorToCourse = async ({ courseId, instructorId, actorId }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  if (course.status === 'archived' && instructorId) {
    throw new AppError('Archived courses cannot be reassigned to a new instructor.', 409)
  }

  if (instructorId) {
    if (!mongoose.isValidObjectId(instructorId)) throw new AppError('Invalid instructor selection.', 400)
    const selectedUser = await User.findById(instructorId).lean()
    if (!selectedUser) throw new AppError('Selected instructor was not found.', 404)
    if (selectedUser.role !== 'instructor') throw new AppError('Selected user is not an instructor.', 400)
  }

  const updated = await Course.findByIdAndUpdate(courseId, {
    $set: {
      instructorId: instructorId ? new mongoose.Types.ObjectId(instructorId) : null,
      updatedBy: actorId,
      reviewStatus: instructorId ? course.reviewStatus : 'not_submitted'
    }
  }, { new: true, runValidators: true }).lean()

  return serializeCourse(updated)
}

export const approveCourseReview = async ({ courseId, adminId, feedback = null }) => {
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  const updated = await Course.findByIdAndUpdate(courseId, {
    $set: {
      reviewStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      reviewFeedback: null,
      updatedBy: adminId
    }
  }, { new: true, runValidators: true }).lean()
  return serializeCourse(updated)
}

export const requestCourseChanges = async ({ courseId, adminId, feedback }) => {
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  const cleanFeedback = sanitizeReviewFeedback(feedback)
  if (!cleanFeedback) throw new AppError('Feedback is required when requesting changes.', 422)

  const updated = await Course.findByIdAndUpdate(courseId, {
    $set: {
      reviewStatus: 'changes_requested',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      reviewFeedback: cleanFeedback,
      updatedBy: adminId
    }
  }, { new: true, runValidators: true }).lean()
  return serializeCourse(updated)
}

export const getAssignableInstructors = async () => {
  const users = await User.find({ role: 'instructor' }).sort({ name: 1 }).lean()
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email
  }))
}

export const buildInstructorCourseUpdate = (payload) => {
  const updates = {}
  for (const [key, value] of Object.entries(payload || {})) {
    if (!allowedEditableFields.has(key)) continue
    updates[key] = value
  }
  return updates
}
