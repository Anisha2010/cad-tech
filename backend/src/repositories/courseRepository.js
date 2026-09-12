import mongoose from 'mongoose'
import { Course, serializeCourse } from '../models/Course.js'

const normalizeSlug = (value) => typeof value === 'string' ? value.trim().toLowerCase() : ''

export const getPublishedCourses = async ({ search = '', software = '', level = '', category = '', page = 1, limit = 12 } = {}) => {
  const filter = { status: 'published' }
  if (software) filter.software = software
  if (level) filter.level = level
  if (category) filter.category = category
  if (search) {
    filter.$or = [
      { title: { $regex: String(search).trim(), $options: 'i' } },
      { slug: { $regex: String(search).trim(), $options: 'i' } },
      { software: { $regex: String(search).trim(), $options: 'i' } }
    ]
  }

  const query = Course.find(filter).sort({ title: 1 })
  const [totalItems, courses] = await Promise.all([
    Course.countDocuments(filter),
    query.skip((page - 1) * limit).limit(limit).lean()
  ])

  return { courses: courses.map(serializeCourse), totalItems, page, limit, totalPages: totalItems ? Math.ceil(totalItems / limit) : 0 }
}

export const getCourseBySlug = async (slug, { includeArchived = false, includeDraft = false } = {}) => {
  const normalized = normalizeSlug(slug)
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null
  const filter = { slug: normalized }
  if (!includeArchived && !includeDraft) filter.status = 'published'
  if (includeArchived && includeDraft) delete filter.status
  const course = await Course.findOne(filter).lean()
  return course ? serializeCourse(course) : null
}

export const getCourseById = async (id, { includeArchived = false, includeDraft = false } = {}) => {
  if (!mongoose.isValidObjectId(id)) return null
  const filter = { _id: id }
  if (!includeArchived && !includeDraft) filter.status = 'published'
  const course = await Course.findOne(filter).lean()
  return course ? serializeCourse(course) : null
}

export const getCoursesByIds = async (ids) => {
  if (!Array.isArray(ids) || !ids.length) return []
  const courses = await Course.find({ status: 'published', _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
  return courses.map(serializeCourse)
}

export const getAdminCourses = async ({ search = '', status = 'all', page = 1, limit = 12 } = {}) => {
  const filter = {}
  if (status && status !== 'all') filter.status = status
  if (search) {
    filter.$or = [
      { title: { $regex: String(search).trim(), $options: 'i' } },
      { slug: { $regex: String(search).trim(), $options: 'i' } },
      { software: { $regex: String(search).trim(), $options: 'i' } }
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