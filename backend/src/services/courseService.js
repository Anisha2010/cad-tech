import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { User } from '../models/User.js'
import {
  courseSlugExists,
  createCourseRecord,
  findCourseById,
  getAdminCourses,
  getCourseBySlug,
  getCoursesByIds,
  getPublishedCourses,
  hasRelatedCourseData,
  updateCourseRecord,
  updateCourseStatusRecord,
  archiveCourseRecord
} from '../repositories/courseRepository.js'

const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const COURSE_STATUSES = ['draft', 'published', 'archived']

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

const normalizeObjectId = (value) => {
  if (value === null || value === undefined || value === '') return null
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null
}

const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
const isValidCoursePrice = (value) => value === null || (Number.isInteger(value) && value > 0)

const ensureRequiredFields = (course) => {
  const errors = []
  if (!course.title || !course.title.trim()) errors.push('Course title is required.')
  if (!course.software || !course.software.trim()) errors.push('Software is required.')
  if (!course.category || !course.category.trim()) errors.push('Category is required.')
  if (!course.shortDescription || !course.shortDescription.trim()) errors.push('Short description is required.')
  if (!course.description || !course.description.trim()) errors.push('Description is required.')
  if (!course.level || !COURSE_LEVELS.includes(course.level)) errors.push('Please select a course level.')
  if (course.enrollmentOpen && (!Number.isInteger(course.priceInPaise) || course.priceInPaise <= 0)) errors.push('A valid price is required before opening enrollment.')
  return errors
}

export const getPublicCourseList = async ({ page = 1, limit = 12, search = '', software = '', level = '', category = '', duration = '', sort = 'featured' } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  return getPublishedCourses({ search, software, level, category, duration, sort, page: safePage, limit: safeLimit })
}

export const getCourseDetailBySlug = async (slug) => {
  const course = await getCourseBySlug(slug, { includeArchived: false, includeDraft: false })
  return course
}

export const getAdminCourseList = async ({ search = '', status = 'all', software = '', page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  return getAdminCourses({ search, status, software, page: safePage, limit: safeLimit })
}

export const getCourseAdminDetail = async (courseId) => {
  return findCourseById(courseId)
}

export const createAdminCourse = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const instructorId = normalizeObjectId(payload.instructorId)
  if (payload.instructorId !== undefined && payload.instructorId !== null && payload.instructorId !== '' && !instructorId) {
    throw new AppError('Invalid instructor selection.', 400)
  }
  if (instructorId) {
    const instructor = await User.findById(instructorId).lean()
    if (!instructor) throw new AppError('Selected instructor was not found.', 404)
    if (instructor.role !== 'instructor') throw new AppError('Selected user is not an instructor.', 400)
  }

  const input = {
    title: normalizeString(payload.title),
    slug: normalizeString(payload.slug),
    shortDescription: normalizeString(payload.shortDescription),
    description: normalizeString(payload.description),
    category: normalizeString(payload.category),
    software: normalizeString(payload.software),
    level: normalizeString(payload.level),
    duration: payload.duration === undefined || payload.duration === null ? null : normalizeString(payload.duration),
    lessonCount: payload.lessonCount === undefined || payload.lessonCount === null || payload.lessonCount === '' ? null : Number(payload.lessonCount),
    thumbnailUrl: payload.thumbnailUrl === undefined || payload.thumbnailUrl === null ? null : normalizeString(payload.thumbnailUrl),
    learningOutcomes: Array.isArray(payload.learningOutcomes) ? payload.learningOutcomes.map((value) => String(value).trim()).filter(Boolean).slice(0, 12) : [],
    requirements: Array.isArray(payload.requirements) ? payload.requirements.map((value) => String(value).trim()).filter(Boolean).slice(0, 12) : [],
    priceInPaise: payload.priceInPaise === '' || payload.priceInPaise === null || payload.priceInPaise === undefined ? null : Number(payload.priceInPaise),
    currency: 'INR',
    enrollmentOpen: Boolean(payload.enrollmentOpen),
    status: 'draft',
    instructorId,
    reviewStatus: 'not_submitted',
    createdBy: userId,
    updatedBy: userId
  }

  const requiredErrors = ensureRequiredFields(input)
  if (requiredErrors.length) throw new AppError(requiredErrors[0], 400)
  if (input.enrollmentOpen && !isValidCoursePrice(input.priceInPaise)) throw new AppError('A valid price is required before opening enrollment.', 400)
  if (input.priceInPaise !== null && (!Number.isInteger(input.priceInPaise) || input.priceInPaise <= 0)) throw new AppError('Enter a valid course price.', 400)

  const slug = slugify(input.slug || input.title)
  if (!slug) throw new AppError('Course title is required.', 400)
  if (await courseSlugExists(slug)) throw new AppError('A course with this slug already exists.', 409)

  const course = await createCourseRecord({
    title: input.title,
    slug,
    shortDescription: input.shortDescription,
    description: input.description,
    category: input.category,
    software: input.software,
    level: input.level,
    duration: input.duration || null,
    lessonCount: Number.isInteger(input.lessonCount) && input.lessonCount >= 0 ? input.lessonCount : null,
    thumbnailUrl: input.thumbnailUrl || null,
    learningOutcomes: input.learningOutcomes,
    requirements: input.requirements,
    priceInPaise: input.priceInPaise,
    currency: 'INR',
    enrollmentOpen: Boolean(input.enrollmentOpen) && isValidCoursePrice(input.priceInPaise),
    status: 'draft',
    instructorId: input.instructorId,
    reviewStatus: 'not_submitted',
    createdBy: userId,
    updatedBy: userId
  })

  return course
}

export const updateAdminCourse = async ({ courseId, userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCourseById(courseId)
  if (!existing) return null

  const title = payload.title !== undefined ? normalizeString(payload.title) : existing.title
  const slug = payload.slug !== undefined ? normalizeString(payload.slug) : existing.slug
  const shortDescription = payload.shortDescription !== undefined ? normalizeString(payload.shortDescription) : existing.shortDescription
  const description = payload.description !== undefined ? normalizeString(payload.description) : existing.description
  const category = payload.category !== undefined ? normalizeString(payload.category) : existing.category
  const software = payload.software !== undefined ? normalizeString(payload.software) : existing.software
  const level = payload.level !== undefined ? normalizeString(payload.level) : existing.level
  const duration = payload.duration !== undefined ? (payload.duration === null ? null : normalizeString(payload.duration)) : existing.duration
  const lessonCount = payload.lessonCount !== undefined ? Number(payload.lessonCount ?? 0) : existing.lessonCount
  const thumbnailUrl = payload.thumbnailUrl !== undefined ? (payload.thumbnailUrl === null ? null : normalizeString(payload.thumbnailUrl)) : existing.thumbnailUrl
  const learningOutcomes = payload.learningOutcomes !== undefined ? (Array.isArray(payload.learningOutcomes) ? payload.learningOutcomes.map((value) => String(value).trim()).filter(Boolean).slice(0, 12) : []) : (Array.isArray(existing.learningOutcomes) ? existing.learningOutcomes : [])
  const requirements = payload.requirements !== undefined ? (Array.isArray(payload.requirements) ? payload.requirements.map((value) => String(value).trim()).filter(Boolean).slice(0, 12) : []) : (Array.isArray(existing.requirements) ? existing.requirements : [])
  const priceInPaise = payload.priceInPaise !== undefined ? (payload.priceInPaise === '' || payload.priceInPaise === null ? null : Number(payload.priceInPaise)) : existing.priceInPaise
  const enrollmentOpen = payload.enrollmentOpen !== undefined ? Boolean(payload.enrollmentOpen) : existing.enrollmentOpen
  const status = payload.status !== undefined && COURSE_STATUSES.includes(payload.status) ? payload.status : existing.status
  const instructorId = payload.instructorId !== undefined ? (payload.instructorId === null || payload.instructorId === '' ? null : normalizeObjectId(payload.instructorId)) : existing.instructorId ? new mongoose.Types.ObjectId(existing.instructorId) : null
  if (payload.instructorId !== undefined && payload.instructorId !== null && payload.instructorId !== '' && instructorId) {
    const instructor = await User.findById(instructorId).lean()
    if (!instructor) throw new AppError('Selected instructor was not found.', 404)
    if (instructor.role !== 'instructor') throw new AppError('Selected user is not an instructor.', 400)
  }

  if (!title) throw new AppError('Course title is required.', 400)
  if (!software) throw new AppError('Software is required.', 400)
  if (!level || !COURSE_LEVELS.includes(level)) throw new AppError('Please select a course level.', 400)
  const requiredErrors = ensureRequiredFields({ title, software, level, category, shortDescription, description, enrollmentOpen, priceInPaise })
  if (status === 'published' && requiredErrors.length) throw new AppError(requiredErrors[0], 400)
  if (priceInPaise !== null && (!Number.isInteger(priceInPaise) || priceInPaise <= 0)) throw new AppError('Enter a valid course price.', 400)
  if (enrollmentOpen && !isValidCoursePrice(priceInPaise)) throw new AppError('A valid price is required before opening enrollment.', 400)

  const generatedSlug = slugify(slug || title)
  if (!generatedSlug) throw new AppError('Course title is required.', 400)
  if (generatedSlug !== existing.slug && await hasRelatedCourseData(courseId, existing.slug)) {
    throw new AppError('This course slug cannot be changed because related course data already exists.', 409)
  }
  if (generatedSlug !== existing.slug && (await courseSlugExists(generatedSlug, courseId))) throw new AppError('A course with this slug already exists.', 409)

  const updates = {
    title,
    slug: generatedSlug,
    shortDescription: shortDescription || existing.shortDescription,
    description: description || existing.description,
    category: category || existing.category,
    software,
    level,
    duration,
    lessonCount: Number.isInteger(lessonCount) && lessonCount >= 0 ? lessonCount : null,
    thumbnailUrl: thumbnailUrl || null,
    learningOutcomes,
    requirements,
    priceInPaise,
    currency: 'INR',
    enrollmentOpen: status === 'published' && Boolean(enrollmentOpen) && isValidCoursePrice(priceInPaise),
    status,
    instructorId,
    updatedBy: userId
  }

  return updateCourseRecord(courseId, updates)
}

export const updateAdminCourseStatus = async ({ courseId, userId, status }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  const existing = await findCourseById(courseId)
  if (!existing) return null

  if (!COURSE_STATUSES.includes(status)) throw new AppError('Invalid course status.', 400)
  const nextStatus = status
  const nextEnrollmentOpen = nextStatus === 'published' ? existing.enrollmentOpen : false

  const requiredErrors = ensureRequiredFields({ ...existing, status: nextStatus, enrollmentOpen: nextEnrollmentOpen })
  if (nextStatus === 'published' && requiredErrors.length > 0) {
    throw new AppError(requiredErrors[0], 400)
  }
  if (nextStatus === 'published' && nextEnrollmentOpen && !isValidCoursePrice(existing.priceInPaise)) {
    throw new AppError('A valid price is required before opening enrollment.', 400)
  }

  const updated = await updateCourseStatusRecord(courseId, nextStatus, nextEnrollmentOpen, userId)
  return updated
}

export const deleteAdminCourse = async ({ courseId, userId }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  const existing = await findCourseById(courseId)
  if (!existing) return null
  const archived = await archiveCourseRecord(courseId, userId)
  return archived
}

export { getPublishedCourses, getCourseBySlug, getCoursesByIds }
