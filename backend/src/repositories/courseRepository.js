import mongoose from 'mongoose'
import { Course, serializeCourse, serializePublicCourse } from '../models/Course.js'
import { CourseCurriculum } from '../models/CourseCurriculum.js'
import { Enrollment } from '../models/Enrollment.js'
import { Payment } from '../models/Payment.js'

const normalizeSlug = (value) => typeof value === 'string' ? value.trim().toLowerCase() : ''
const escapeRegex = (value) => String(value).trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getPublishedCourses = async ({ search = '', software = '', level = '', category = '', duration = '', sort = 'featured', page = 1, limit = 12 } = {}) => {
  const filter = { status: 'published' }
  if (software) filter.software = { $in: String(software).split(',').map((value) => value.trim()).filter(Boolean) }
  if (level) filter.level = { $in: String(level).split(',').map((value) => value.trim()).filter(Boolean) }
  if (category) filter.category = { $in: String(category).split(',').map((value) => value.trim()).filter(Boolean) }
  if (search) {
    const safeSearch = escapeRegex(search)
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { slug: { $regex: safeSearch, $options: 'i' } },
      { software: { $regex: safeSearch, $options: 'i' } }
    ]
  }

  const query = Course.find(filter).lean()
  const allCourses = await query
  const durationHours = (value) => {
    const match = String(value || '').toLowerCase().match(/(\d+(?:\.\d+)?)/)
    if (!match) return Number.POSITIVE_INFINITY
    const amount = Number(match[1])
    const unit = String(value).toLowerCase()
    if (/week/.test(unit)) return amount * 168
    if (/day/.test(unit)) return amount * 24
    if (/minute|min\b/.test(unit)) return amount / 60
    return amount
  }
  const durationRanges = {
    'under-5': (hours) => hours < 5,
    '5-8': (hours) => hours >= 5 && hours <= 8,
    'over-8': (hours) => hours > 8
  }
  const matchesDuration = durationRanges[duration]
  let courses = matchesDuration ? allCourses.filter((course) => {
    const hours = durationHours(course.duration)
    return Number.isFinite(hours) && matchesDuration(hours)
  }) : allCourses
  const levelOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 }
  if (sort === 'name-desc') courses.sort((left, right) => String(right.title || '').localeCompare(String(left.title || '')))
  else if (sort === 'duration-short') courses.sort((left, right) => durationHours(left.duration) - durationHours(right.duration))
  else if (sort === 'duration-long') courses.sort((left, right) => durationHours(right.duration) - durationHours(left.duration))
  else if (sort === 'level') courses.sort((left, right) => (levelOrder[left.level] ?? 99) - (levelOrder[right.level] ?? 99) || String(left.title || '').localeCompare(String(right.title || '')))
  else courses.sort((left, right) => String(left.title || '').localeCompare(String(right.title || '')))

  const totalItems = courses.length
  courses = courses.slice((page - 1) * limit, page * limit)
  return { courses: courses.map(serializePublicCourse), totalItems, page, limit, totalPages: totalItems ? Math.ceil(totalItems / limit) : 0 }
}

export const getCourseBySlug = async (slug, { includeArchived = false, includeDraft = false } = {}) => {
  const normalized = normalizeSlug(slug)
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null
  const filter = { slug: normalized }
  if (includeArchived && includeDraft) delete filter.status
  else if (includeArchived) filter.status = { $in: ['published', 'archived'] }
  else if (!includeDraft) filter.status = 'published'
  const course = await Course.findOne(filter).lean()
  return course ? serializePublicCourse(course) : null
}

export const getCourseById = async (id, { includeArchived = false, includeDraft = false } = {}) => {
  if (!mongoose.isValidObjectId(id)) return null
  const filter = { _id: id }
  if (includeArchived && includeDraft) delete filter.status
  else if (includeArchived) filter.status = { $in: ['published', 'archived'] }
  else if (!includeDraft) filter.status = 'published'
  const course = await Course.findOne(filter).lean()
  return course ? serializePublicCourse(course) : null
}

export const getCoursesByIds = async (ids) => {
  if (!Array.isArray(ids) || !ids.length) return []
  const courses = await Course.find({ status: 'published', _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
  return courses.map(serializePublicCourse)
}

export const getAdminCourses = async ({ search = '', status = 'all', software = '', page = 1, limit = 12 } = {}) => {
  const filter = {}
  if (status && status !== 'all') filter.status = status
  if (software) filter.software = software
  if (search) {
    const safeSearch = escapeRegex(search)
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { slug: { $regex: safeSearch, $options: 'i' } },
      { software: { $regex: safeSearch, $options: 'i' } }
    ]
  }

  const [totalItems, courses] = await Promise.all([
    Course.countDocuments(filter),
    Course.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
  ])

  return { courses: courses.map(serializeCourse), totalItems, page, limit, totalPages: totalItems ? Math.ceil(totalItems / limit) : 0 }
}

export const createCourseRecord = async (payload) => {
  const course = await Course.create(payload)
  return serializeCourse(course)
}

export const updateCourseRecord = async (courseId, updates, options = {}) => {
  const course = await Course.findOneAndUpdate({ _id: courseId }, { $set: updates }, { new: true, runValidators: true, ...options }).lean()
  return course ? serializeCourse(course) : null
}

export const findCourseById = async (courseId) => {
  if (!mongoose.isValidObjectId(courseId)) return null
  const course = await Course.findById(courseId).lean()
  return course ? serializeCourse(course) : null
}

export const updateCourseStatusRecord = async (courseId, status, enrollmentOpen, updatedBy) => {
  const course = await Course.findByIdAndUpdate(courseId, { $set: { status, enrollmentOpen, updatedBy } }, { new: true, runValidators: true }).lean()
  return course ? serializeCourse(course) : null
}

export const archiveCourseRecord = async (courseId, updatedBy) => {
  const course = await Course.findByIdAndUpdate(courseId, { $set: { status: 'archived', enrollmentOpen: false, updatedBy } }, { new: true, runValidators: true }).lean()
  return course ? serializeCourse(course) : null
}

export const deleteCourseRecord = async (courseId) => {
  const course = await Course.findById(courseId)
  if (!course) return null
  if (course.status === 'archived') {
    await Course.deleteOne({ _id: courseId })
    return true
  }
  return false
}

export const ensureUniqueSlug = async (slug, excludeId = null) => {
  const normalized = normalizeSlug(slug)
  if (!normalized) return false
  const existing = await Course.findOne({ slug: normalized, _id: { $ne: excludeId } }).lean()
  return !existing
}

export const courseSlugExists = async (slug, excludeId = null) => {
  return !(await ensureUniqueSlug(slug, excludeId))
}

export const hasRelatedCourseData = async (courseId, slug) => {
  const [payment, enrollment, curriculum] = await Promise.all([
    Payment.exists({ courseId }),
    Enrollment.exists({ courseId }),
    CourseCurriculum.exists({ courseSlug: slug })
  ])
  return Boolean(payment || enrollment || curriculum)
}