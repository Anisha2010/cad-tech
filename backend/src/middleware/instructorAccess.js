import mongoose from 'mongoose'
import { Course } from '../models/Course.js'
import { sendError } from '../utils/response.js'

const safeObjectIdMatch = (left, right) => {
  if (!left || !right) return false
  return String(left) === String(right)
}

export const requireAssignedInstructor = async (req, res, next) => {
  if (!req.user || req.user.role !== 'instructor') {
    return sendError(res, 'You do not have permission to access this resource.', 403)
  }

  const courseId = req.params?.courseId
  if (!courseId || !mongoose.isValidObjectId(courseId)) {
    return sendError(res, 'Course not found.', 404)
  }

  const course = await Course.findById(courseId).lean()
  if (!course) {
    return sendError(res, 'Course not found.', 404)
  }

  if (!course.instructorId || !safeObjectIdMatch(course.instructorId, req.user.id)) {
    return sendError(res, 'You are not assigned to this course.', 403)
  }

  req.course = course
  next()
}

export default requireAssignedInstructor
