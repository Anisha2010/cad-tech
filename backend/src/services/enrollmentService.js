import { getCourseBySlug } from '../config/courses.js'
import { createEnrollment, findActiveEnrollment, listActiveEnrollments } from '../repositories/enrollmentRepository.js'

export const getActiveEnrollment = (userId, courseSlug) => findActiveEnrollment(userId, courseSlug)

export const activateEnrollment = ({ userId, courseSlug, paymentId }) => createEnrollment({
  userId,
  courseSlug,
  paymentId,
  status: 'active',
  progressPercentage: 0,
  completedLessons: [],
  enrolledAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export const getStudentEnrollments = (userId) => listActiveEnrollments(userId)
  .map((enrollment) => {
    const course = getCourseBySlug(enrollment.courseSlug)
    if (!course) return null
    return {
      id: enrollment.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      software: course.software,
      level: course.level,
      duration: course.duration,
      lessons: course.lessons,
      image: course.image,
      progressPercentage: enrollment.progressPercentage,
      enrolledAt: enrollment.enrolledAt
    }
  })
  .filter(Boolean)