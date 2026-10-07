import mongoose from 'mongoose'
import { getCourseBySlug } from '../repositories/courseRepository.js'
import { findActiveEnrollment } from '../repositories/enrollmentRepository.js'
import { getPublishedCurriculumByCourseSlug } from '../repositories/learningRepository.js'
import { Enrollment } from '../models/Enrollment.js'
import { Quiz } from '../models/Quiz.js'
import { QuizAttempt } from '../models/QuizAttempt.js'

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
  const course = await getCourseBySlug(courseSlug, { includeArchived: true })
  if (!course) return null

  const enrollment = await findActiveEnrollment(userId, course.id)
  if (!enrollment) return null

  const curriculum = await getPublishedCurriculumByCourseSlug(course.slug)
  const quizLessonIds = (curriculum?.sections || []).flatMap((section) => section.lessons || [])
    .filter((lesson) => lesson.lessonType === 'quiz' && mongoose.isValidObjectId(lesson.id))
    .map((lesson) => new mongoose.Types.ObjectId(lesson.id))
  const quizzes = quizLessonIds.length ? await Quiz.find({
    courseId: new mongoose.Types.ObjectId(course.id),
    lessonId: { $in: quizLessonIds },
    reviewStatus: 'approved',
    publicationStatus: 'published'
  }).select('_id lessonId title maximumAttempts timeLimitMinutes totalMarks passingPercentage').lean() : []
  const quizIds = quizzes.map((quiz) => quiz._id)
  const quizAttempts = quizIds.length ? await QuizAttempt.find({
    studentId: new mongoose.Types.ObjectId(String(userId)),
    courseId: new mongoose.Types.ObjectId(course.id),
    enrollmentId: enrollment._id,
    quizId: { $in: quizIds }
  }).select('_id quizId attemptNumber status passed submittedAt startedAt expiresAt').sort({ attemptNumber: -1, startedAt: -1 }).lean() : []
  const quizMap = new Map(quizzes.map((quiz) => [String(quiz.lessonId), quiz]))
  const attemptsByQuiz = new Map()
  for (const attempt of quizAttempts) {
    const key = String(attempt.quizId)
    if (!attemptsByQuiz.has(key)) attemptsByQuiz.set(key, [])
    attemptsByQuiz.get(key).push(attempt)
  }

  const totalLessons = countTotalLessons(curriculum)
  const progressMap = buildProgressMap(enrollment.lessonProgress || [])

  const sections = Array.isArray(curriculum?.sections) ? curriculum.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: Number(section.order || 0),
    lessons: Array.isArray(section.lessons) ? section.lessons.map((lesson) => {
      const quiz = quizMap.get(String(lesson.id))
      const attempts = quiz ? attemptsByQuiz.get(String(quiz._id)) || [] : []
      const completedAttempts = attempts.filter((attempt) => ['submitted', 'expired'].includes(attempt.status))
      const inProgressAttempt = attempts.find((attempt) => attempt.status === 'in_progress' && (!attempt.expiresAt || new Date(attempt.expiresAt) > new Date()))
      const latestAttempt = completedAttempts[0] || null
      const maximumAttempts = Number(quiz?.maximumAttempts || 1)
      const attemptsUsed = completedAttempts.length
      return {
        ...lesson,
        quizId: quiz ? String(quiz._id) : null,
        quiz: quiz ? {
          id: String(quiz._id),
          title: quiz.title,
          maximumAttempts,
          attemptsUsed,
          remainingAttempts: Math.max(maximumAttempts - attemptsUsed, 0),
          inProgressAttemptId: inProgressAttempt ? String(inProgressAttempt._id) : null,
          latestAttempt: latestAttempt ? {
            id: String(latestAttempt._id),
            attemptNumber: Number(latestAttempt.attemptNumber),
            status: latestAttempt.status,
            passed: latestAttempt.passed,
            submittedAt: latestAttempt.submittedAt ? new Date(latestAttempt.submittedAt).toISOString() : null
          } : null,
          timeLimitMinutes: quiz.timeLimitMinutes,
          totalMarks: Number(quiz.totalMarks || 0),
          passingPercentage: Number(quiz.passingPercentage || 0)
        } : null,
        progress: progressMap.get(String(lesson.id)) || {
          lessonId: String(lesson.id),
          title: lesson.title,
          status: 'not_started',
          lastPositionSeconds: 0,
          completedAt: null,
          updatedAt: null
        }
      }
    }) : []
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
  const course = await getCourseBySlug(courseSlug, { includeArchived: true })
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
  const course = await getCourseBySlug(courseSlug, { includeArchived: true })
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
