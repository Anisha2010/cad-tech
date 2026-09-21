import mongoose from 'mongoose'
import { Assignment, serializeAssignment } from '../models/Assignment.js'
import { Course } from '../models/Course.js'
import { AppError } from '../utils/AppError.js'
import {
  ensureAssessmentNotLockedForInstructor,
  ensureAssignedInstructorForCourse,
  ensureCourseExists,
  ensureLessonBelongsToCourse,
  validateAssignmentPayload
} from './assessmentReviewService.js'

export const listCourseAssignments = async ({ courseId, instructorId, filters = {} } = {}) => {
  const course = await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const query = { courseId: new mongoose.Types.ObjectId(courseId) }
  if (filters.type && filters.type !== 'all') query.type = filters.type
  if (filters.reviewStatus && filters.reviewStatus !== 'all') query.reviewStatus = filters.reviewStatus
  if (filters.publicationStatus && filters.publicationStatus !== 'all') query.publicationStatus = filters.publicationStatus
  if (filters.search) {
    const escaped = String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { instructions: { $regex: escaped, $options: 'i' } }
    ]
  }

  const assignments = await Assignment.find(query).sort({ updatedAt: -1 }).lean()
  return assignments.map(serializeAssignment)
}

export const createAssignment = async ({ courseId, instructorId, payload = {} }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const targetCourse = await ensureCourseExists(courseId)
  if (targetCourse.status === 'archived') throw new AppError('Archived courses cannot accept new assessments.', 409)

  const assignmentInput = validateAssignmentPayload(payload)
  await ensureLessonBelongsToCourse({ courseId, lessonId: assignmentInput.lessonId })

  const direct = await Assignment.create({
    courseId: new mongoose.Types.ObjectId(courseId),
    lessonId: assignmentInput.lessonId ? new mongoose.Types.ObjectId(String(assignmentInput.lessonId)) : null,
    title: assignmentInput.title,
    description: assignmentInput.description,
    instructions: assignmentInput.instructions,
    maximumMarks: assignmentInput.maximumMarks,
    dueDate: assignmentInput.dueDate,
    allowLateSubmissions: assignmentInput.allowLateSubmissions,
    allowedSubmissionTypes: assignmentInput.allowedSubmissionTypes,
    resources: assignmentInput.resources,
    createdBy: new mongoose.Types.ObjectId(instructorId),
    updatedBy: new mongoose.Types.ObjectId(instructorId),
    reviewStatus: 'not_submitted',
    publicationStatus: 'draft'
  })

  return serializeAssignment(direct)
}

export const getAssignmentByIdForInstructor = async ({ courseId, instructorId, assignmentId }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const assignment = await Assignment.findOne({ _id: assignmentId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  return serializeAssignment(assignment)
}

export const updateAssignment = async ({ courseId, instructorId, assignmentId, payload = {} }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const assignment = await Assignment.findOne({ _id: assignmentId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: assignment })

  const sanitized = validateAssignmentPayload({ ...assignment, ...payload })
  await ensureLessonBelongsToCourse({ courseId, lessonId: sanitized.lessonId })

  const updated = await Assignment.findByIdAndUpdate(assignment._id, {
    $set: {
      lessonId: sanitized.lessonId,
      title: sanitized.title,
      description: sanitized.description,
      instructions: sanitized.instructions,
      maximumMarks: sanitized.maximumMarks,
      dueDate: sanitized.dueDate,
      allowLateSubmissions: sanitized.allowLateSubmissions,
      allowedSubmissionTypes: sanitized.allowedSubmissionTypes,
      resources: sanitized.resources,
      updatedBy: new mongoose.Types.ObjectId(instructorId)
    }
  }, { new: true, runValidators: true }).lean()

  return serializeAssignment(updated)
}

export const submitAssignmentForReview = async ({ courseId, instructorId, assignmentId }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const assignment = await Assignment.findOne({ _id: assignmentId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.publicationStatus === 'published') throw new AppError('Published assignments cannot be edited or resubmitted.', 409)
  if (assignment.reviewStatus === 'pending') throw new AppError('This assignment is already pending review.', 409)

  const sanitized = validateAssignmentPayload(assignment)
  const updated = await Assignment.findByIdAndUpdate(assignment._id, {
    $set: {
      lessonId: sanitized.lessonId,
      title: sanitized.title,
      description: sanitized.description,
      instructions: sanitized.instructions,
      maximumMarks: sanitized.maximumMarks,
      dueDate: sanitized.dueDate,
      allowLateSubmissions: sanitized.allowLateSubmissions,
      allowedSubmissionTypes: sanitized.allowedSubmissionTypes,
      resources: sanitized.resources,
      reviewStatus: 'pending',
      publicationStatus: 'draft',
      reviewFeedback: null,
      submittedForReviewAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      updatedBy: new mongoose.Types.ObjectId(instructorId)
    }
  }, { new: true, runValidators: true }).lean()

  return serializeAssignment(updated)
}

export const archiveAssignment = async ({ courseId, instructorId, assignmentId }) => {
  const assignment = await Assignment.findOne({ _id: assignmentId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (String(assignment.createdBy || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  if (assignment.publicationStatus === 'published') throw new AppError('Published assignments cannot be archived by instructors.', 409)
  if (assignment.reviewStatus === 'pending') throw new AppError('Pending assignments cannot be archived by instructors.', 409)

  const updated = await Assignment.findByIdAndUpdate(assignment._id, {
    $set: {
      publicationStatus: 'archived',
      archivedAt: new Date(),
      updatedBy: new mongoose.Types.ObjectId(instructorId)
    }
  }, { new: true, runValidators: true }).lean()

  return serializeAssignment(updated)
}

export const getAssignmentForAdminReview = async ({ assignmentId }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  return serializeAssignment(assignment)
}

export const approveAssignment = async ({ assignmentId, adminId }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.reviewStatus !== 'pending') throw new AppError('Only pending assessments can be approved.', 409)
  const updated = await Assignment.findByIdAndUpdate(assignmentId, {
    $set: {
      reviewStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      reviewFeedback: null,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeAssignment(updated)
}

export const requestAssignmentChanges = async ({ assignmentId, adminId, feedback }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  const clean = typeof feedback === 'string' ? feedback.trim() : ''
  if (!clean) throw new AppError('Feedback is required when requesting changes.', 422)
  const updated = await Assignment.findByIdAndUpdate(assignmentId, {
    $set: {
      reviewStatus: 'changes_requested',
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      reviewFeedback: clean,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeAssignment(updated)
}

export const publishAssignment = async ({ assignmentId, adminId }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  const course = await Course.findById(assignment.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  if (course.status !== 'published') throw new AppError('Parent course must be published before this assessment can be published.', 409)
  if (assignment.publicationStatus === 'archived') throw new AppError('Archived assessments cannot be published.', 409)
  if (assignment.reviewStatus !== 'approved') throw new AppError('Only approved assessments can be published.', 409)
  const updated = await Assignment.findByIdAndUpdate(assignmentId, {
    $set: {
      publicationStatus: 'published',
      publishedAt: new Date(),
      publishedBy: new mongoose.Types.ObjectId(adminId),
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeAssignment(updated)
}

export const unpublishAssignment = async ({ assignmentId, adminId }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.publicationStatus !== 'published') throw new AppError('Only published assessments can be unpublished.', 409)
  const updated = await Assignment.findByIdAndUpdate(assignmentId, {
    $set: {
      publicationStatus: 'draft',
      publishedAt: null,
      publishedBy: null,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeAssignment(updated)
}

export const archiveAssignmentAsAdmin = async ({ assignmentId, adminId }) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  const updated = await Assignment.findByIdAndUpdate(assignmentId, {
    $set: {
      publicationStatus: 'archived',
      archivedAt: new Date(),
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeAssignment(updated)
}

export default {
  listCourseAssignments,
  createAssignment,
  getAssignmentByIdForInstructor,
  updateAssignment,
  submitAssignmentForReview,
  archiveAssignment,
  getAssignmentForAdminReview,
  approveAssignment,
  requestAssignmentChanges,
  publishAssignment,
  unpublishAssignment,
  archiveAssignmentAsAdmin
}
