import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Course } from '../models/Course.js'
import { CourseCurriculum, serializeCourseCurriculum } from '../models/CourseCurriculum.js'

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const objectId = (value) => mongoose.isValidObjectId(value) ? value : null

const toArray = (value) => Array.isArray(value) ? value : []

const isSafeUrl = (value, { allowLocalhost = true } = {}) => {
  const trimmed = normalizeText(value)
  if (!trimmed) return false
  if (/^(javascript:|data:)/i.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (allowLocalhost && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')) return true
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

const getCourseForCurriculum = async (courseId) => {
  if (!objectId(courseId)) return null
  return Course.findById(courseId).lean()
}

const getOrCreateCurriculum = async (course) => {
  const existing = await CourseCurriculum.findOne({ courseId: course._id }).lean()
  if (existing) return existing

  const created = await CourseCurriculum.create({
    courseId: course._id,
    courseSlug: course.slug,
    status: 'draft',
    isPublished: false,
    sections: []
  })

  return created.toObject()
}

const listActiveSections = (curriculum = {}) => {
  const sections = toArray(curriculum.sections)
  return sections.filter((section) => !section.archivedAt && !section.isArchived)
}

const listActiveLessons = (section = {}) => {
  const lessons = toArray(section.lessons)
  return lessons.filter((lesson) => !lesson.archivedAt && !lesson.isArchived)
}

const ensureSectionExists = (curriculum, sectionId) => {
  const section = toArray(curriculum.sections).find((entry) => String(entry.id || entry._id) === String(sectionId))
  if (!section) throw new AppError('Section not found.', 404)
  return section
}

const ensureLessonExists = (section, lessonId) => {
  const lesson = toArray(section.lessons).find((entry) => String(entry.id || entry._id) === String(lessonId))
  if (!lesson) throw new AppError('Lesson not found.', 404)
  return lesson
}

const buildSectionPayload = (payload = {}) => {
  const title = normalizeText(payload.title)
  if (!title) throw new AppError('Section title is required.', 400)

  return {
    id: new mongoose.Types.ObjectId().toString(),
    title,
    description: normalizeText(payload.description),
    order: Number.isInteger(Number(payload.order)) ? Number(payload.order) : 0,
    isPublished: Boolean(payload.isPublished),
    archivedAt: null,
    lessons: []
  }
}

const buildLessonPayload = (payload = {}) => {
  const type = payload.type || 'video'
  const supportedTypes = ['video', 'article', 'pdf']
  if (!supportedTypes.includes(type)) throw new AppError('Unsupported lesson type.', 400)

  const title = normalizeText(payload.title)
  if (!title) throw new AppError('Lesson title is required.', 400)

  const description = normalizeText(payload.description)
  const durationSeconds = payload.durationSeconds === undefined || payload.durationSeconds === null || payload.durationSeconds === ''
    ? null
    : Number(payload.durationSeconds)

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    throw new AppError('Lesson duration must be a non-negative integer in seconds.', 400)
  }

  const resources = Array.isArray(payload.resources) ? payload.resources.map((resource) => ({
    title: normalizeText(resource?.title || 'Resource'),
    url: normalizeText(resource?.url || '')
  })).filter((resource) => resource.title && resource.url && isSafeUrl(resource.url, { allowLocalhost: true })) : []

  const lesson = {
    id: new mongoose.Types.ObjectId().toString(),
    title,
    description,
    type,
    order: Number.isInteger(Number(payload.order)) ? Number(payload.order) : 0,
    durationSeconds: durationSeconds ?? null,
    videoUrl: null,
    articleContent: null,
    pdfUrl: null,
    captionsUrl: null,
    resources,
    isPublished: Boolean(payload.isPublished),
    archivedAt: null
  }

  if (type === 'video') {
    const videoUrl = normalizeText(payload.videoUrl)
    if (!isSafeUrl(videoUrl, { allowLocalhost: true })) throw new AppError('A valid video URL is required for video lessons.', 400)
    lesson.videoUrl = videoUrl
    lesson.captionsUrl = normalizeText(payload.captionsUrl) || null
    if (lesson.captionsUrl && !isSafeUrl(lesson.captionsUrl, { allowLocalhost: true })) {
      throw new AppError('Captions URL is invalid.', 400)
    }
  }

  if (type === 'article') {
    const articleContent = normalizeText(payload.articleContent)
    if (!articleContent) throw new AppError('Article content is required for article lessons.', 400)
    lesson.articleContent = articleContent
  }

  if (type === 'pdf') {
    const pdfUrl = normalizeText(payload.pdfUrl)
    if (!isSafeUrl(pdfUrl, { allowLocalhost: true })) throw new AppError('A valid PDF URL is required for PDF lessons.', 400)
    lesson.pdfUrl = pdfUrl
  }

  return lesson
}

const normalizeSectionOrder = (sections) => {
  const ordered = [...sections].sort((left, right) => (Number(left.order || 0) - Number(right.order || 0)))
  return ordered.map((section, index) => ({ ...section, order: index }))
}

const normalizeLessonOrder = (lessons) => {
  const ordered = [...lessons].sort((left, right) => (Number(left.order || 0) - Number(right.order || 0)))
  return ordered.map((lesson, index) => ({ ...lesson, order: index }))
}

const validatePublishedCurriculum = (curriculum) => {
  const sections = listActiveSections(curriculum)
  if (!sections.length) {
    throw new AppError('At least one active section is required before publishing.', 400)
  }

  const publishedLessons = sections.flatMap((section) => listActiveLessons(section).filter((lesson) => lesson.isPublished !== false))
  if (!publishedLessons.length) {
    throw new AppError('At least one published lesson is required before publishing.', 400)
  }

  for (const lesson of publishedLessons) {
    if (!normalizeText(lesson.title)) throw new AppError('Every published lesson must have a title.', 400)
    if (lesson.type === 'video' && !isSafeUrl(lesson.videoUrl, { allowLocalhost: true })) {
      throw new AppError('Video lessons must include a valid video URL before publishing.', 400)
    }
    if (lesson.type === 'article' && !normalizeText(lesson.articleContent)) {
      throw new AppError('Article lessons must include content before publishing.', 400)
    }
    if (lesson.type === 'pdf' && !isSafeUrl(lesson.pdfUrl, { allowLocalhost: true })) {
      throw new AppError('PDF lessons must include a valid PDF URL before publishing.', 400)
    }
  }
}

export const getAdminCurriculum = async ({ courseId }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  return {
    course: {
      id: String(course._id),
      title: course.title,
      slug: course.slug,
      status: course.status
    },
    curriculum: serializeCourseCurriculum(curriculum)
  }
}

export const createSection = async ({ courseId, payload = {} }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = buildSectionPayload(payload)
  section.order = listActiveSections(curriculum).length
  const nextSections = [...listActiveSections(curriculum), section]
  const nextCurriculum = {
    ...curriculum,
    sections: normalizeSectionOrder(nextSections)
  }

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { courseSlug: course.slug, sections: nextCurriculum.sections, isPublished: false, status: 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const updateSection = async ({ courseId, sectionId, payload = {} }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)

  const title = normalizeText(payload.title)
  if (title) section.title = title
  if (payload.description !== undefined) section.description = normalizeText(payload.description)
  if (payload.isPublished !== undefined) section.isPublished = Boolean(payload.isPublished)

  if (payload.isPublished === false && section.archivedAt === null) section.archivedAt = null

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections), updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const archiveSection = async ({ courseId, sectionId }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)
  section.archivedAt = new Date()
  section.isPublished = false
  section.lessons = toArray(section.lessons).map((lesson) => ({ ...lesson, archivedAt: lesson.archivedAt || new Date(), isPublished: false }))

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections), isPublished: false, status: 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return { archived: true, sectionId, curriculum: serializeCourseCurriculum(updated) }
}

export const reorderSections = async ({ courseId, orderedSectionIds = [] }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const activeSections = listActiveSections(curriculum)
  const incoming = toArray(orderedSectionIds).map(String)
  const expected = activeSections.map((section) => String(section.id || section._id)).sort()
  const seen = new Set()
  if (incoming.length !== expected.length || incoming.some((id) => seen.has(id) || !expected.includes(id) ? seen.add(id) : false)) {
    throw new AppError('The complete section order is required and must contain unique, valid IDs.', 400)
  }

  const sectionMap = new Map(activeSections.map((section) => [String(section.id || section._id), section]))
  const nextSections = incoming.map((id, index) => ({ ...sectionMap.get(id), order: index }))
  const merged = toArray(curriculum.sections).map((section) => {
    const key = String(section.id || section._id)
    const found = sectionMap.get(key)
    return found ? { ...section, ...found, order: incoming.indexOf(key) } : section
  })

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(merged), updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const createLesson = async ({ courseId, sectionId, payload = {} }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)
  const lesson = buildLessonPayload(payload)
  lesson.order = listActiveLessons(section).length
  section.lessons = [...listActiveLessons(section), lesson]
  section.isPublished = false

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections).map((entry) => entry.id === section.id ? { ...entry, lessons: normalizeLessonOrder(entry.lessons || []) } : entry), isPublished: false, status: 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const updateLesson = async ({ courseId, sectionId, lessonId, payload = {} }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)
  const lesson = ensureLessonExists(section, lessonId)

  const nextType = payload.type || lesson.type || 'video'
  const nextTitle = normalizeText(payload.title)
  if (nextTitle) lesson.title = nextTitle
  if (payload.description !== undefined) lesson.description = normalizeText(payload.description)

  if (payload.type) {
    if (!['video', 'article', 'pdf'].includes(payload.type)) throw new AppError('Unsupported lesson type.', 400)
    lesson.type = payload.type
    lesson.videoUrl = null
    lesson.articleContent = null
    lesson.pdfUrl = null
    lesson.captionsUrl = null
  }

  if (payload.durationSeconds !== undefined) {
    const durationSeconds = payload.durationSeconds === null || payload.durationSeconds === '' ? null : Number(payload.durationSeconds)
    if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
      throw new AppError('Lesson duration must be a non-negative integer in seconds.', 400)
    }
    lesson.durationSeconds = durationSeconds
  }

  if (payload.isPublished !== undefined) lesson.isPublished = Boolean(payload.isPublished)
  if (payload.resources !== undefined) lesson.resources = toArray(payload.resources).map((resource) => ({
    title: normalizeText(resource?.title || 'Resource'),
    url: normalizeText(resource?.url || '')
  })).filter((resource) => resource.title && resource.url && isSafeUrl(resource.url, { allowLocalhost: true }))

  if (nextType === 'video') {
    if (payload.videoUrl !== undefined) {
      const videoUrl = normalizeText(payload.videoUrl)
      if (!videoUrl || !isSafeUrl(videoUrl, { allowLocalhost: true })) throw new AppError('A valid video URL is required for video lessons.', 400)
      lesson.videoUrl = videoUrl
    }
    if (payload.captionsUrl !== undefined) {
      const captionsUrl = normalizeText(payload.captionsUrl)
      lesson.captionsUrl = captionsUrl ? isSafeUrl(captionsUrl, { allowLocalhost: true }) ? captionsUrl : null : null
    }
  }

  if (nextType === 'article') {
    if (payload.articleContent !== undefined) {
      const articleContent = normalizeText(payload.articleContent)
      if (!articleContent) throw new AppError('Article content is required for article lessons.', 400)
      lesson.articleContent = articleContent
    }
  }

  if (nextType === 'pdf') {
    if (payload.pdfUrl !== undefined) {
      const pdfUrl = normalizeText(payload.pdfUrl)
      if (!pdfUrl || !isSafeUrl(pdfUrl, { allowLocalhost: true })) throw new AppError('A valid PDF URL is required for PDF lessons.', 400)
      lesson.pdfUrl = pdfUrl
    }
  }

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections).map((entry) => entry.id === section.id ? { ...entry, lessons: normalizeLessonOrder(entry.lessons || []) } : entry), isPublished: false, status: 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const archiveLesson = async ({ courseId, sectionId, lessonId }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)
  const lesson = ensureLessonExists(section, lessonId)
  lesson.archivedAt = new Date()
  lesson.isPublished = false

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections).map((entry) => entry.id === section.id ? { ...entry, lessons: normalizeLessonOrder(entry.lessons || []) } : entry), isPublished: false, status: 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return { archived: true, lessonId, curriculum: serializeCourseCurriculum(updated) }
}

export const reorderLessons = async ({ courseId, sectionId, orderedLessonIds = [] }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const section = ensureSectionExists(curriculum, sectionId)
  const activeLessons = listActiveLessons(section)
  const expected = activeLessons.map((lesson) => String(lesson.id || lesson._id)).sort()
  const incoming = toArray(orderedLessonIds).map(String)
  const seen = new Set()

  if (incoming.length !== expected.length || incoming.some((id) => seen.has(id) || !expected.includes(id) ? seen.add(id) : false)) {
    throw new AppError('The complete lesson order is required and must contain unique, valid IDs.', 400)
  }

  const lessonMap = new Map(activeLessons.map((lesson) => [String(lesson.id || lesson._id), lesson]))
  const merged = toArray(section.lessons).map((lesson) => ({
    ...lesson,
    order: incoming.indexOf(String(lesson.id || lesson._id))
  }))

  section.lessons = normalizeLessonOrder(merged)

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { sections: normalizeSectionOrder(curriculum.sections), updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}

export const publishCurriculum = async ({ courseId, payload = {} }) => {
  const course = await getCourseForCurriculum(courseId)
  if (!course) return null
  const curriculum = await getOrCreateCurriculum(course)
  const nextPublished = Boolean(payload.isPublished)
  if (nextPublished) validatePublishedCurriculum(curriculum)

  const updated = await CourseCurriculum.findOneAndUpdate(
    { courseId: course._id },
    { $set: { isPublished: nextPublished, status: nextPublished ? 'published' : 'draft', updatedAt: new Date() } },
    { new: true, runValidators: true }
  )

  return serializeCourseCurriculum(updated)
}
