import multer from 'multer'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as assignmentSubmissionService from '../services/assignmentSubmissionService.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.ASSIGNMENT_UPLOAD_MAX_BYTES || 10485760),
    files: 1
  }
})

const parseQueryString = (value) => (typeof value === 'string' ? value.trim() : '')

export const getStudentAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.getStudentAssignmentDetails({ studentId: req.user.id, assignmentId: req.params.assignmentId })
  return sendSuccess(res, result, 'Assignment details retrieved successfully.')
})

export const createStudentSubmissionDraft = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.createSubmissionDraft({ studentId: req.user.id, assignmentId: req.params.assignmentId })
  return sendSuccess(res, result, 'Draft created successfully.', 201)
})

export const updateStudentSubmission = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const textAnswer = typeof payload.textAnswer === 'string' ? payload.textAnswer : ''
  const result = await assignmentSubmissionService.updateDraftText({ studentId: req.user.id, submissionId: req.params.submissionId, textAnswer })
  return sendSuccess(res, result, 'Draft saved successfully.')
})

export const uploadStudentSubmissionAttachment = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) {
      return sendError(res, 'No file was provided.', 400)
    }

    try {
      const result = await assignmentSubmissionService.uploadSubmissionAttachment({
        studentId: req.user.id,
        submissionId: req.params.submissionId,
        file,
        allowedSubmissionTypes: req.body?.allowedSubmissionTypes || []
      })
      return sendSuccess(res, result, 'Attachment uploaded successfully.')
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 503) {
        return sendError(res, 'File upload is temporarily unavailable.', 503)
      }
      throw error
    }
  })
]

export const removeStudentSubmissionAttachment = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.removeSubmissionAttachment({
    studentId: req.user.id,
    submissionId: req.params.submissionId,
    attachmentId: req.params.attachmentId
  })
  return sendSuccess(res, result, 'Attachment removed successfully.')
})

export const submitStudentSubmission = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.submitAssignmentFinal({ studentId: req.user.id, submissionId: req.params.submissionId })
  return sendSuccess(res, result, 'Submission finalised successfully.')
})

export const listStudentSubmissions = asyncHandler(async (req, res) => {
  const courseId = parseQueryString(req.query.courseId)
  const status = parseQueryString(req.query.status)
  const result = await assignmentSubmissionService.listStudentSubmissions({
    studentId: req.user.id,
    courseId: courseId || null,
    status: status || null
  })
  return sendSuccess(res, result, 'Student submissions retrieved successfully.')
})

export const getStudentSubmissionDetail = asyncHandler(async (req, res) => {
  const result = await assignmentSubmissionService.getStudentSubmissionDetail({ studentId: req.user.id, submissionId: req.params.submissionId })
  return sendSuccess(res, result, 'Submission retrieved successfully.')
})

export default {
  getStudentAssignment,
  createStudentSubmissionDraft,
  updateStudentSubmission,
  uploadStudentSubmissionAttachment,
  removeStudentSubmissionAttachment,
  submitStudentSubmission,
  listStudentSubmissions,
  getStudentSubmissionDetail
}
