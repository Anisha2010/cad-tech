import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import {
  courseSlugExists,
  createCourseRecord,
  findCourseById,
  getAdminCourses,
  getCourseBySlug,
  getCoursesByIds,
  getPublishedCourses,
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

export const getPublicCourseList = async ({ page = 1, limit = 12, search = '', software = '', level = '', category = '' } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  return getPublishedCourses({ search, software, level, category, page: safePage, limit: safeLimit })
}

export const getCourseDetailBySlug = async (slug) => {
  const course = await getCourseBySlug(slug, { includeArchived: false, includeDraft: false })
  return course
}

export const getAdminCourseList = async ({ search = '', status = 'all', page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  return getAdminCourses({ search, status, page: safePage, limit: safeLimit })
}

export const getCourseAdminDetail = async (courseId) => {
  return findCourseById(courseId)
}

export const createAdminCourse = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const input = {
    title: normalizeString(payload.title),
    slug: normalizeString(payload.slug),
    shortDescription: normalizeString(payload.shortDescription),
    description: normalizeString(payload.description),
    category: normalizeString(payload.category),
    software: normalizeString(payload.software),
    level: normalizeString(payload.level),
    duration: payload.duration === undefined || payload.duration === null ? null : normalizeString(payload.duration),
    lessonCount: Number(payload.lessonCount ?? 0),
    thumbnailUrl: payload.thumbnailUrl === undefined || payload.thumbnailUrl === null ? null : normalizeString(payload.thumbnailUrl),
    priceInPaise: payload.priceInPaise === '' || payload.priceInPaise === null || payload.priceInPaise === undefined ? null : Number(payload.priceInPaise),
    currency: 'INR',
    enrollmentOpen: Boolean(payload.enrollmentOpen),
    status: 'draft',
    createdBy: userId,
    updatedBy: userId
  }

  if (!input.title) throw new AppError('Course title is required.', 400)
  if (!input.software) throw new AppError('Software is required.', 400)
  if (!input.level || !COURSE_LEVELS.includes(input.level)) throw new AppError('Please select a course level.', 400)
  if (input.enrollmentOpen && !isValidCoursePrice(input.priceInPaise)) throw new AppError('A valid price is required before opening enrollment.', 400)
  if (input.priceInPaise !== null && (!Number.isInteger(input.priceInPaise) || input.priceInPaise <= 0)) throw new AppError('Enter a valid course price.', 400)

  const slug = slugify(input.slug || input.title)
  if (!slug) throw new AppError('Course title is required.', 400)
  if (await courseSlugExists(slug)) throw new AppError('A course with this slug already exists.', 409)

  const course = await createCourseRecord({
    title: input.title,
    slug,
    shortDescription: input.shortDescription || 'Course description coming soon.',
    description: input.description || input.shortDescription || 'Course description coming soon.',
    category: input.category || 'General',
    software: input.software,
    level: input.level,
    duration: input.duration || null,
    lessonCount: Number.isInteger(input.lessonCount) && input.lessonCount >= 0 ? input.lessonCount : 0,
    thumbnailUrl: input.thumbnailUrl || null,
    priceInPaise: input.priceInPaise,
    currency: 'INR',
    enrollmentOpen: Boolean(input.enrollmentOpen) && isValidCoursePrice(input.priceInPaise),
    status: 'draft',
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
  const priceInPaise = payload.priceInPaise !== undefined ? (payload.priceInPaise === '' || payload.priceInPaise === null ? null : Number(payload.priceInPaise)) : existing.priceInPaise
  const enrollmentOpen = payload.enrollmentOpen !== undefined ? Boolean(payload.enrollmentOpen) : existing.enrollmentOpen
  const status = payload.status !== undefined && COURSE_STATUSES.includes(payload.status) ? payload.status : existing.status

  if (!title) throw new AppError('Course title is required.', 400)
  if (!software) throw new AppError('Software is required.', 400)
  if (!level || !COURSE_LEVELS.includes(level)) throw new AppError('Please select a course level.', 400)
  if (priceInPaise !== null && (!Number.isInteger(priceInPaise) || priceInPaise <= 0)) throw new AppError('Enter a valid course price.', 400)
  if (enrollmentOpen && !isValidCoursePrice(priceInPaise)) throw new AppError('A valid price is required before opening enrollment.', 400)

  const generatedSlug = slugify(slug || title)
  if (!generatedSlug) throw new AppError('Course title is required.', 400)
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
    lessonCount: Number.isInteger(lessonCount) && lessonCount >= 0 ? lessonCount : 0,
    thumbnailUrl: thumbnailUrl || null,
    priceInPaise,
    currency: 'INR',
    enrollmentOpen: Boolean(enrollmentOpen) && isValidCoursePrice(priceInPaise),
    status,
    updatedBy: userId
  }

  return updateCourseRecord(courseId, updates)
}

export const updateAdminCourseStatus = async ({ courseId, userId, status }) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  const existing = await findCourseById(courseId)
  if (!existing) return null

  const nextStatus = status === 'published' ? 'published' : status === 'archived' ? 'archived' : existing.status
  const nextEnrollmentOpen = nextStatus === 'archived' ? false : existing.enrollmentOpen

  const requiredErrors = ensureRequiredFields({ ...existing, status: nextStatus, enrollmentOpen: nextEnrollmentOpen })
  if (nextStatus === 'published' && requiredErrors.length > 0) {
    throw new AppError(requiredErrors[0], 400)
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
