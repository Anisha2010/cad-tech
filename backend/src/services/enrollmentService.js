import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { getCourseBySlug } from '../repositories/courseRepository.js'
import { createVerifiedEnrollment as createMongoEnrollment, findActiveEnrollment } from '../repositories/enrollmentRepository.js'

export const getActiveEnrollment = async (userId, courseSlug, options = {}) => {
  const course = await getCourseBySlug(courseSlug)
  return course ? findActiveEnrollment(userId, course.id, options) : null
}

export const createVerifiedEnrollment = async ({ userId, courseSlug, paymentId }) => {
  const course = await getCourseBySlug(courseSlug)
  if (!course || !mongoose.isValidObjectId(userId)) throw new AppError('Course enrollment could not be created.', 400)
  return createMongoEnrollment({ userId, courseId: course.id, paymentId })
}

export const activateEnrollment = createVerifiedEnrollment

export { getStudentEnrollments, getStudentEnrollmentSummary, getContinueLearningCourses, getRecentEnrollments } from '../repositories/enrollmentRepository.js'