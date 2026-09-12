import { getCourseBySlug } from '../repositories/courseRepository.js'
import { findActiveEnrollment } from '../repositories/enrollmentRepository.js'
import { getPublishedCurriculumByCourseSlug } from '../repositories/learningRepository.js'
import { Enrollment } from '../models/Enrollment.js'

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeLessonState = (value) => {
  if (value === 'completed') return 'completed'
  if (value === 'in_progress') return 'in_progress'
  return 'not_started'
}

const buildProgressMap = (lessonProgress = []) => {
  const progressMap = new Map()
  for (const item of lessonProgress || []) {
    if (!item || !item.lessonId) continue
    progressMap.set(String(item.lessonId), {
      lessonId: String(item.lessonId),
      title: item.title || '',
      status: normalizeLessonState(item.status),
      lastPositionSeconds: asNumber(item.lastPositionSeconds, 0),
      completedAt: item.completedAt || null,
      updatedAt: item.updatedAt || null
    })
  }
  return progressMap
}

const countCompletedLessons = (lessonProgress = []) => lessonProgress.filter((item) => normalizeLessonState(item.status) === 'completed').length

const countTotalLessons = (curriculum = null) => {
  if (!curriculum || !Array.isArray(curriculum.sections)) return 0
  return curriculum.sections.reduce((total, section) => total + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0)
}

export const getStudentLearningView = async ({ userId, courseSlug }) => {
  const course = await getCourseBySlug(courseSlug)
  if (!course) return null

  const enrollment = await findActiveEnrollment(userId, course.id)
  if (!enrollment) return null

  const curriculum = await getPublishedCurriculumByCourseSlug(course.slug)
  const totalLessons = countTotalLessons(curriculum)
  const progressMap = buildProgressMap(enrollment.lessonProgress || [])

  const sections = Array.isArray(curriculum?.sections) ? curriculum.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: Number(section.order || 0),
    lessons: Array.isArray(section.lessons) ? section.lessons.map((lesson) => ({
      ...lesson,
      progress: progressMap.get(String(lesson.id)) || {
        lessonId: String(lesson.id),
        title: lesson.title,
        status: 'not_started',
        lastPositionSeconds: 0,
        completedAt: null,
        updatedAt: null
      }
    })) : []
  })) : []

  const completedLessons = sections.reduce((count, section) => {
    return count + (section.lessons.filter((lesson) => normalizeLessonState(lesson.progress?.status) === 'completed').length)
  }, 0)

  const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : Number(enrollment.progressPercentage || 0)

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      software: course.software,
      category: course.category,
      level: course.level,
      duration: course.duration,
      thumbnailUrl: course.thumbnailUrl,
      lessonCount: course.lessonCount || totalLessons
    },
    enrollment: {
      id: String(enrollment._id || enrollment.id),
      status: enrollment.status,
      progressPercentage,
      lastAccessedAt: enrollment.lastAccessedAt,
      completedAt: enrollment.completedAt
    },
    curriculum: {
      courseSlug: course.slug,
      totalLessons,
      completedLessons,
      progressPercentage,
      sections
    }
  }
}

export const updateLessonProgress = async ({ userId, courseSlug, lessonId, payload = {} }) => {
  const course = await getCourseBySlug(courseSlug)
  if (!course) return null

  const enrollment = await findActiveEnrollment(userId, course.id)
  if (!enrollment) return null

  const curriculum = await getPublishedCurriculumByCourseSlug(course.slug)
  if (!curriculum) return { error: 'No published lesson curriculum is available for this course yet.' }

  const lessonExists = curriculum.sections.some((section) => section.lessons.some((lesson) => String(lesson.id) === String(lessonId)))
  if (!lessonExists) return { error: 'Lesson not found in this course curriculum.' }

  const lessonProgress = Array.isArray(enrollment.lessonProgress) ? enrollment.lessonProgress : []
  const nextStatus = normalizeLessonState(payload.status)
  const isCompleted = payload.completed === true || nextStatus === 'completed'
  const currentIndex = lessonProgress.findIndex((entry) => String(entry.lessonId) === String(lessonId))
  const nextEntry = {
    lessonId: String(lessonId),
    title: payload.title || lessonId,
    status: isCompleted ? 'completed' : (nextStatus === 'in_progress' ? 'in_progress' : 'not_started'),
    lastPositionSeconds: asNumber(payload.lastPositionSeconds, lessonProgress[currentIndex]?.lastPositionSeconds || 0),
    completedAt: isCompleted ? new Date() : (lessonProgress[currentIndex]?.completedAt || null),
    updatedAt: new Date()
  }

  if (currentIndex >= 0) {
    lessonProgress[currentIndex] = nextEntry
  } else {
    lessonProgress.push(nextEntry)
  }

  const completedCount = countCompletedLessons(lessonProgress)
  const totalLessons = countTotalLessons(curriculum)
  const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0

  const nextStatusValue = progressPercentage >= 100 ? 'completed' : 'active'
  const updatedEnrollment = await Enrollment.findOneAndUpdate(
    { _id: enrollment._id },
    {
      $set: {
        lessonProgress,
        progressPercentage,
        status: nextStatusValue,
        lastAccessedAt: new Date(),
        completedAt: nextStatusValue === 'completed' ? new Date() : null
      }
    },
    { new: true }
  )

  return {
    lessonId: String(lessonId),
    status: nextEntry.status,
    progressPercentage,
    updated: Boolean(updatedEnrollment?.modifiedCount || updatedEnrollment?.upsertedCount || updatedEnrollment?.acknowledged)
  }
}

export const updateLessonPosition = async ({ userId, courseSlug, lessonId, payload = {} }) => {
  const course = await getCourseBySlug(courseSlug)
  if (!course) return null

  const enrollment = await findActiveEnrollment(userId, course.id)
  if (!enrollment) return null

  const curriculum = await getPublishedCurriculumByCourseSlug(course.slug)
  if (!curriculum) return { error: 'No published lesson curriculum is available for this course yet.' }

  const lessonExists = curriculum.sections.some((section) => section.lessons.some((lesson) => String(lesson.id) === String(lessonId)))
  if (!lessonExists) return { error: 'Lesson not found in this course curriculum.' }

  const lessonProgress = Array.isArray(enrollment.lessonProgress) ? enrollment.lessonProgress : []
  const nextSeconds = asNumber(payload.positionSeconds, 0)
  const currentIndex = lessonProgress.findIndex((entry) => String(entry.lessonId) === String(lessonId))
  const nextEntry = {
    lessonId: String(lessonId),
    title: payload.title || lessonProgress[currentIndex]?.title || lessonId,
    status: payload.status ? normalizeLessonState(payload.status) : (lessonProgress[currentIndex]?.status || 'in_progress'),
    lastPositionSeconds: nextSeconds,
    completedAt: lessonProgress[currentIndex]?.completedAt || null,
    updatedAt: new Date()
  }

  if (currentIndex >= 0) lessonProgress[currentIndex] = nextEntry
  else lessonProgress.push(nextEntry)

  const updatedEnrollment = await Enrollment.findOneAndUpdate(
    { _id: enrollment._id },
    {
      $set: {
        lessonProgress,
        lastAccessedAt: new Date(),
        progressPercentage: Number(enrollment.progressPercentage || 0)
      }
    },
    { new: true }
  )

  return {
    lessonId: String(lessonId),
    lastPositionSeconds: nextSeconds,
    status: nextEntry.status,
    updated: Boolean(updatedEnrollment?.modifiedCount || updatedEnrollment?.upsertedCount || updatedEnrollment?.acknowledged)
  }
}
