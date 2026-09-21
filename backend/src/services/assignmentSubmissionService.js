import mongoose from 'mongoose'
import { Assignment, serializeAssignment } from '../models/Assignment.js'
import { AssignmentSubmission, serializeAssignmentSubmission } from '../models/AssignmentSubmission.js'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { AppError } from '../utils/AppError.js'
import { deleteAssignmentFile, isAssignmentStorageConfigured, uploadAssignmentFile, assignmentAllowedMimeTypes, getAssignmentUploadMaxBytes, fileUploadStatus } from '../config/storage.js'

const MAX_TEXT_LENGTH = 10000
const MAX_ATTACHMENTS = 5

const safeTrim = (value) => typeof value === 'string' ? value.trim() : ''

const normalizeTextSubmission = (value) => {
  const text = safeTrim(value)
  if (!text) return ''
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text
}

const isAllowedType = (assignment, mimeType) => {
  const allowed = Array.isArray(assignment?.allowedSubmissionTypes) ? assignment.allowedSubmissionTypes : []
  if (!allowed.length || !mimeType) return false

  const normalized = String(mimeType).trim().toLowerCase()
  return allowed.some((type) => {
    const allowedList = assignmentAllowedMimeTypes[type] || []
    return allowedList.includes(normalized)
  })
}

const getSubmissionStatusLabel = (status) => {
  const map = {
    draft: 'Draft',
    submitted: 'Submitted',
    late: 'Late',
    under_review: 'Under Review',
    graded: 'Graded',
    resubmission_requested: 'Resubmission Requested'
  }
  return map[status] || 'Submitted'
}

const ensureStudentEnrollment = async ({ studentId, courseId }) => {
  const enrollment = await Enrollment.findOne({ userId: new mongoose.Types.ObjectId(studentId), courseId: new mongoose.Types.ObjectId(courseId), status: { $in: ['active', 'completed'] } }).lean()
  if (!enrollment) throw new AppError('You are not enrolled in this course.', 403)
  return enrollment
}

const ensureAssignmentPublished = async (assignmentId) => {
  const assignment = await Assignment.findById(assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.publicationStatus === 'archived') throw new AppError('This assignment is archived.', 410)
  if (assignment.publicationStatus !== 'published') throw new AppError('Assignment is not available for student submission.', 403)
  const course = await Course.findById(assignment.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  if (course.status !== 'published') throw new AppError('Parent course is not published.', 403)
  return { assignment, course }
}

const getLatestRevision = async ({ studentId, assignmentId }) => {
  return AssignmentSubmission.findOne({ studentId: new mongoose.Types.ObjectId(studentId), assignmentId: new mongoose.Types.ObjectId(assignmentId) }).sort({ revisionNumber: -1, createdAt: -1 }).lean()
}

const buildSubmissionSummary = (submission) => {
  const data = serializeAssignmentSubmission(submission)
  return {
    ...data,
    readOnlyStatus: getSubmissionStatusLabel(data.status),
    isEditable: data.status === 'draft'
  }
}

export const getStudentAssignmentDetails = async ({ studentId, assignmentId }) => {
  const { assignment, course } = await ensureAssignmentPublished(assignmentId)
  await ensureStudentEnrollment({ studentId, courseId: course._id })

  const latestSubmission = await getLatestRevision({ studentId, assignmentId })

  return {
    assignment: {
      id: String(assignment._id),
      courseId: String(assignment.courseId),
      courseTitle: course.title,
      title: assignment.title,
      instructions: assignment.instructions,
      description: assignment.description,
      maximumMarks: Number(assignment.maximumMarks || 0),
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      allowedSubmissionTypes: Array.isArray(assignment.allowedSubmissionTypes) ? assignment.allowedSubmissionTypes : [],
      allowLateSubmissions: Boolean(assignment.allowLateSubmissions),
      resources: Array.isArray(assignment.resources) ? assignment.resources.map((resource) => ({
        id: String(resource._id || resource.id),
        title: resource.title || '',
        url: resource.url || ''
      })) : [],
      publicationStatus: assignment.publicationStatus
    },
    currentDraft: latestSubmission ? buildSubmissionSummary(latestSubmission) : null,
    resubmissionRequested: Boolean(latestSubmission && latestSubmission.status === 'resubmission_requested')
  }
}

export const createSubmissionDraft = async ({ studentId, assignmentId }) => {
  const { assignment, course } = await ensureAssignmentPublished(assignmentId)
  const enrollment = await ensureStudentEnrollment({ studentId, courseId: course._id })

  const existingDraft = await AssignmentSubmission.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
    assignmentId: new mongoose.Types.ObjectId(assignmentId),
    status: 'draft'
  }).sort({ createdAt: -1 }).lean()

  if (existingDraft) {
    return buildSubmissionSummary(existingDraft)
  }

  const latestSubmission = await getLatestRevision({ studentId, assignmentId })
  const nextRevision = (latestSubmission?.revisionNumber || 0) + 1

  const draft = await AssignmentSubmission.create({
    assignmentId: new mongoose.Types.ObjectId(assignmentId),
    courseId: new mongoose.Types.ObjectId(assignment.courseId),
    studentId: new mongoose.Types.ObjectId(studentId),
    enrollmentId: new mongoose.Types.ObjectId(enrollment._id),
    revisionNumber: nextRevision,
    status: 'draft',
    textAnswer: '',
    attachments: [],
    dueDateSnapshot: assignment.dueDate || null,
    maximumMarksSnapshot: Number(assignment.maximumMarks || 0),
    isLate: false,
    submittedAt: null,
    supersedesSubmissionId: latestSubmission?._id || null,
    resubmissionReason: null,
    resubmissionRequestedBy: null,
    resubmissionRequestedAt: null
  })

  return buildSubmissionSummary(draft)
}

export const updateDraftText = async ({ studentId, submissionId, textAnswer }) => {
  const submission = await AssignmentSubmission.findOne({ _id: submissionId, studentId: new mongoose.Types.ObjectId(studentId) }).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  if (submission.status !== 'draft') throw new AppError('Only draft submissions can be edited.', 409)

  const cleanText = normalizeTextSubmission(textAnswer)
  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $set: {
      textAnswer: cleanText,
      updatedAt: new Date()
    }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

export const uploadSubmissionAttachment = async ({ studentId, submissionId, file, allowedSubmissionTypes }) => {
  const submission = await AssignmentSubmission.findOne({ _id: submissionId, studentId: new mongoose.Types.ObjectId(studentId) }).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  if (submission.status !== 'draft') throw new AppError('Only draft submissions can accept attachments.', 409)

  const assignment = await Assignment.findById(submission.assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.publicationStatus !== 'published') throw new AppError('Assignment is no longer available for submission.', 403)

  const allowedTypes = Array.isArray(assignment.allowedSubmissionTypes) ? assignment.allowedSubmissionTypes : []
  const matchesAllowedType = allowedTypes.some((type) => Array.isArray(assignmentAllowedMimeTypes[type]) && assignmentAllowedMimeTypes[type].includes((file?.mimetype || '').trim().toLowerCase()))
  if (!matchesAllowedType) {
    throw new AppError('This file type is not allowed for this assignment.', 415)
  }

  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new AppError('No file was provided.', 400)
  }

  const maxBytes = getAssignmentUploadMaxBytes()
  if (file.size > maxBytes) throw new AppError('File exceeds the maximum allowed size.', 413)
  if (file.size <= 0) throw new AppError('Empty files are not allowed.', 400)

  const mimeType = String(file.mimetype || '').trim().toLowerCase()
  const executableAllowed = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!executableAllowed.includes(mimeType)) throw new AppError('Unsupported file type.', 415)
  if (mimeType === 'text/html' || mimeType.includes('script') || mimeType.includes('javascript')) throw new AppError('HTML and script uploads are not allowed.', 415)

  if (!isAssignmentStorageConfigured()) {
    throw new AppError('File upload is temporarily unavailable.', 503)
  }

  if (Array.isArray(submission.attachments) && submission.attachments.length >= MAX_ATTACHMENTS) {
    throw new AppError('This draft has reached the maximum attachment limit.', 422)
  }

  const uploaded = await uploadAssignmentFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType
  })

  const item = {
    _id: new mongoose.Types.ObjectId(),
    provider: uploaded.provider || 'cloudinary',
    storageKey: uploaded.storageKey || uploaded.url || '',
    publicId: uploaded.publicId || null,
    url: uploaded.url || uploaded.secureUrl || '',
    originalName: uploaded.originalName || file.originalname,
    mimeType: mimeType,
    size: Number(file.size || 0),
    uploadedAt: new Date()
  }

  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $push: { attachments: item },
    $set: { updatedAt: new Date() }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

export const removeSubmissionAttachment = async ({ studentId, submissionId, attachmentId }) => {
  const submission = await AssignmentSubmission.findOne({ _id: submissionId, studentId: new mongoose.Types.ObjectId(studentId) }).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  if (submission.status !== 'draft') throw new AppError('Only draft submissions can remove attachments.', 409)

  const target = (submission.attachments || []).find((attachment) => String(attachment._id) === String(attachmentId))
  if (!target) throw new AppError('Attachment not found.', 404)

  if (target.publicId) {
    await deleteAssignmentFile({ publicId: target.publicId })
  }

  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $pull: { attachments: { _id: new mongoose.Types.ObjectId(attachmentId) } },
    $set: { updatedAt: new Date() }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

const validateSubmissionContent = ({ assignment, textAnswer, attachments }) => {
  const allowedTypes = Array.isArray(assignment.allowedSubmissionTypes) ? assignment.allowedSubmissionTypes : []
  const attachmentList = Array.isArray(attachments) ? attachments.filter((entry) => entry && entry.url) : []
  const textValue = safeTrim(textAnswer)
  const hasText = Boolean(textValue)
  const hasFile = attachmentList.length > 0

  if (allowedTypes.includes('text') && !allowedTypes.includes('pdf') && !allowedTypes.includes('document') && !allowedTypes.includes('image')) {
    if (!hasText) throw new AppError('Text submission is required for this assignment.', 422)
    return true
  }

  if (allowedTypes.includes('pdf') || allowedTypes.includes('document') || allowedTypes.includes('image')) {
    if (allowedTypes.includes('text')) {
      if (!hasText && !hasFile) throw new AppError('Submit at least one valid text or file response.', 422)
      return true
    }
    if (!hasFile) throw new AppError('At least one file submission is required for this assignment.', 422)
    return true
  }

  if (!hasText && !hasFile) throw new AppError('This submission cannot be empty.', 422)
  return true
}

export const submitAssignmentFinal = async ({ studentId, submissionId }) => {
  const submission = await AssignmentSubmission.findOne({ _id: submissionId, studentId: new mongoose.Types.ObjectId(studentId) }).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  if (submission.status === 'submitted' || submission.status === 'late' || submission.status === 'under_review' || submission.status === 'graded') {
    return buildSubmissionSummary(submission)
  }
  if (submission.status !== 'draft') throw new AppError('This submission is not editable.', 409)

  const assignment = await Assignment.findById(submission.assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)
  if (assignment.publicationStatus !== 'published') throw new AppError('Assignment is no longer published.', 403)
  if (assignment.publicationStatus === 'archived') throw new AppError('This assignment is archived.', 410)

  const course = await Course.findById(assignment.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  if (course.status !== 'published') throw new AppError('Parent course is not published.', 403)

  await ensureStudentEnrollment({ studentId, courseId: course._id })

  validateSubmissionContent({ assignment, textAnswer: submission.textAnswer, attachments: submission.attachments || [] })

  const now = new Date()
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null
  const isLate = Boolean(dueDate && now.getTime() > dueDate.getTime())

  if (isLate && !assignment.allowLateSubmissions) {
    throw new AppError('The assignment due date has passed and late submissions are not allowed.', 422)
  }

  const nextStatus = isLate ? 'late' : 'submitted'
  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $set: {
      status: nextStatus,
      isLate,
      submittedAt: now,
      updatedAt: now
    }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

export const listStudentSubmissions = async ({ studentId, courseId, status }) => {
  const filter = { studentId: new mongoose.Types.ObjectId(studentId) }
  if (courseId && mongoose.isValidObjectId(courseId)) filter.courseId = new mongoose.Types.ObjectId(courseId)
  if (status && ['draft', 'submitted', 'late', 'under_review', 'graded', 'resubmission_requested'].includes(status)) filter.status = status

  const rows = await AssignmentSubmission.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean()
  const assignmentIds = [...new Set(rows.map((row) => String(row.assignmentId)))]
  const assignments = assignmentIds.length ? await Assignment.find({ _id: { $in: assignmentIds.map((value) => new mongoose.Types.ObjectId(value)) } }).lean() : []
  const map = new Map(assignments.map((entry) => [String(entry._id), entry]))

  return rows.map((entry) => {
    const assignment = map.get(String(entry.assignmentId))
    return {
      ...buildSubmissionSummary(entry),
      courseTitle: assignment?.title || '',
      assignmentTitle: assignment?.title || '',
      maximumMarks: Number(assignment?.maximumMarks || entry.maximumMarksSnapshot || 0)
    }
  })
}

export const getStudentSubmissionDetail = async ({ studentId, submissionId }) => {
  const submission = await AssignmentSubmission.findOne({ _id: submissionId, studentId: new mongoose.Types.ObjectId(studentId) }).lean()
  if (!submission) throw new AppError('Submission not found.', 404)

  const assignment = await Assignment.findById(submission.assignmentId).lean()
  if (!assignment) throw new AppError('Assignment not found.', 404)

  const course = await Course.findById(submission.courseId).lean()
  return {
    submission: buildSubmissionSummary(submission),
    assignment: {
      id: String(assignment._id),
      title: assignment.title,
      instructions: assignment.instructions,
      maximumMarks: Number(assignment.maximumMarks || 0),
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      allowLateSubmissions: Boolean(assignment.allowLateSubmissions),
      courseTitle: course?.title || ''
    }
  }
}

export const listCourseSubmissionsForInstructor = async ({ instructorId, courseId, filters = {} }) => {
  const course = await Course.findById(courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)

  const query = { courseId: new mongoose.Types.ObjectId(courseId) }
  if (filters.assignmentId && mongoose.isValidObjectId(filters.assignmentId)) query.assignmentId = new mongoose.Types.ObjectId(filters.assignmentId)
  if (filters.status && ['submitted', 'late', 'under_review', 'graded', 'resubmission_requested'].includes(filters.status)) query.status = filters.status

  const rows = await AssignmentSubmission.find(query).sort({ submittedAt: -1, createdAt: -1 }).lean()
  const studentIds = [...new Set(rows.map((row) => String(row.studentId)))]
  const students = studentIds.length ? await mongoose.model('User').find({ _id: { $in: studentIds.map((value) => new mongoose.Types.ObjectId(value)) } }, { name: 1, email: 1 }).lean() : []
  const studentsMap = new Map(students.map((user) => [String(user._id), user]))
  const assignmentIds = [...new Set(rows.map((row) => String(row.assignmentId)))]
  const assignments = assignmentIds.length ? await Assignment.find({ _id: { $in: assignmentIds.map((value) => new mongoose.Types.ObjectId(value)) } }).lean() : []
  const assignmentMap = new Map(assignments.map((entry) => [String(entry._id), entry]))

  return rows.map((entry) => {
    const student = studentsMap.get(String(entry.studentId)) || {}
    const assignment = assignmentMap.get(String(entry.assignmentId)) || {}
    return {
      ...buildSubmissionSummary(entry),
      student: {
        id: String(entry.studentId),
        name: student.name || 'Student',
        email: student.email || ''
      },
      assignmentTitle: assignment.title || 'Assignment',
      maximumMarks: Number(assignment.maximumMarks || entry.maximumMarksSnapshot || 0),
      statusLabel: getSubmissionStatusLabel(entry.status)
    }
  })
}

export const getInstructorSubmissionDetail = async ({ instructorId, submissionId }) => {
  const submission = await AssignmentSubmission.findById(submissionId).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  const course = await Course.findById(submission.courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  const assignment = await Assignment.findById(submission.assignmentId).lean()
  return { submission: buildSubmissionSummary(submission), assignment: assignment ? serializeAssignment(assignment) : null, courseTitle: course.title || '' }
}

export const gradeSubmission = async ({ instructorId, submissionId, marksAwarded, feedback }) => {
  const submission = await AssignmentSubmission.findById(submissionId).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  const course = await Course.findById(submission.courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  if (!['submitted', 'late', 'under_review'].includes(submission.status)) throw new AppError('Only pending submissions can be graded.', 409)

  const marks = Number(marksAwarded)
  if (!Number.isFinite(marks) || marks < 0) throw new AppError('Marks must be a non-negative number.', 422)
  const maximumMarks = Number(submission.maximumMarksSnapshot || 0)
  if (maximumMarks > 0 && marks > maximumMarks) throw new AppError('Marks cannot exceed the assignment maximum.', 422)

  const cleanFeedback = typeof feedback === 'string' ? feedback.trim() : ''
  if (cleanFeedback && /<\s*script|<\s*img|<\s*svg|<\s*iframe|<\s*object/i.test(cleanFeedback)) {
    throw new AppError('Feedback cannot contain HTML or script content.', 422)
  }

  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $set: {
      marksAwarded: marks,
      feedback: cleanFeedback || null,
      gradedBy: new mongoose.Types.ObjectId(instructorId),
      gradedAt: new Date(),
      status: 'graded',
      updatedAt: new Date()
    }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

export const requestResubmission = async ({ instructorId, submissionId, reason }) => {
  const submission = await AssignmentSubmission.findById(submissionId).lean()
  if (!submission) throw new AppError('Submission not found.', 404)
  const course = await Course.findById(submission.courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)
  if (String(course.instructorId || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  if (['graded'].includes(submission.status)) throw new AppError('A graded submission cannot be reopened for resubmission.', 409)
  const cleanReason = safeTrim(reason)
  if (!cleanReason) throw new AppError('A resubmission reason is required.', 422)

  const updated = await AssignmentSubmission.findByIdAndUpdate(submissionId, {
    $set: {
      status: 'resubmission_requested',
      resubmissionReason: cleanReason,
      resubmissionRequestedBy: new mongoose.Types.ObjectId(instructorId),
      resubmissionRequestedAt: new Date(),
      updatedAt: new Date()
    }
  }, { new: true, runValidators: true }).lean()

  return buildSubmissionSummary(updated)
}

export const getAssignmentUploadStatus = () => fileUploadStatus()

export default {
  getStudentAssignmentDetails,
  createSubmissionDraft,
  updateDraftText,
  uploadSubmissionAttachment,
  removeSubmissionAttachment,
  submitAssignmentFinal,
  listStudentSubmissions,
  getStudentSubmissionDetail,
  listCourseSubmissionsForInstructor,
  getInstructorSubmissionDetail,
  gradeSubmission,
  requestResubmission,
  getAssignmentUploadStatus
}
