import mongoose from 'mongoose'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { CourseCurriculum, serializeCourseCurriculum } from '../models/CourseCurriculum.js'

const normalizedCourseSlug = (value) => typeof value === 'string' ? value.trim().toLowerCase() : ''

export const getPublishedCurriculumByCourseSlug = async (courseSlug) => {
  const slug = normalizedCourseSlug(courseSlug)
  if (!slug) return null
  const curriculum = await CourseCurriculum.findOne({ courseSlug: slug, status: 'published' }).lean()
  return curriculum ? serializeCourseCurriculum(curriculum) : null
}

export const getEnrollmentForStudentCourse = async (userId, courseId) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null
  return Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'completed'] } }).lean()
}

export const getCourseBySlugForLearning = async (courseSlug) => {
  const slug = normalizedCourseSlug(courseSlug)
  if (!slug) return null
  const course = await Course.findOne({ slug, status: 'published' }).lean()
  if (!course) return null
  return {
    id: String(course._id),
    slug: course.slug,
    title: course.title,
    software: course.software,
    level: course.level,
    category: course.category,
    duration: course.duration,
    lessonCount: Number(course.lessonCount || 0),
    thumbnailUrl: course.thumbnailUrl || null,
    shortDescription: course.shortDescription,
    description: course.description
  }
}
