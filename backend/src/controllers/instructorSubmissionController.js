import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as assignmentSubmissionService from '../services/assignmentSubmissionService.js'

const normalizeQuery = (value) => (typeof value === 'string' ? value.trim() : '')

export const listCourseSubmissions = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.listCourseSubmissionsForInstructor({
    instructorId: req.user.id,
    courseId: req.params.courseId,
    filters: {
      assignmentId: normalizeQuery(req.query.assignmentId),
      status: normalizeQuery(req.query.status),
      search: normalizeQuery(req.query.search)
    }
  })
  return sendSuccess(res, result, 'Course submissions retrieved successfully.')
})

export const getInstructorSubmission = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.getInstructorSubmissionDetail({
    instructorId: req.user.id,
    submissionId: req.params.submissionId
  })
  return sendSuccess(res, result, 'Submission details retrieved successfully.')
})

export const gradeSubmission = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const result = await assignmentSubmissionService.gradeSubmission({
    instructorId: req.user.id,
    submissionId: req.params.submissionId,
    marksAwarded: payload.marksAwarded,
    feedback: payload.feedback
  })
  return sendSuccess(res, result, 'Submission graded successfully.')
})

export const requestSubmissionResubmission = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const result = await assignmentSubmissionService.requestResubmission({
    instructorId: req.user.id,
    submissionId: req.params.submissionId,
    reason: payload.reason
  })
  return sendSuccess(res, result, 'Resubmission requested successfully.')
})

export default {
  listCourseSubmissions,
  getInstructorSubmission,
  gradeSubmission,
  requestSubmissionResubmission
}
