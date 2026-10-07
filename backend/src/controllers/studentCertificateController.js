import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { calculateCourseCompletion } from '../services/courseCompletionService.js'
import { issueCertificateFromEnrollment, verifyCertificate } from '../services/certificateService.js'
import { Certificate } from '../models/Certificate.js'
import { Enrollment } from '../models/Enrollment.js'
import { findCertificateByEnrollment, listCertificatesForStudent, findCertificateById } from '../repositories/certificateRepository.js'

export const getStudentCourseCompletion = asyncHandler(async (req, res) => {
  const result = await calculateCourseCompletion({
    studentId: req.user.id,
    courseId: req.params.courseId
  })

  return sendSuccess(res, result, 'Course completion retrieved successfully.')
})

export const issueStudentCertificate = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOne({
    userId: req.user.id,
    courseId: req.params.courseId,
    status: { $in: ['active', 'completed'] }
  }).lean()

  if (!enrollment) return sendError(res, 'You are not enrolled in this course.', 404)

  try {
    const result = await issueCertificateFromEnrollment({
      studentId: req.user.id,
      courseId: req.params.courseId,
      enrollmentId: String(enrollment._id)
    })

    return sendSuccess(res, { certificate: result.certificate, completion: result.completion }, result.created ? 'Certificate issued successfully.' : 'Certificate already exists.', result.created ? 201 : 200)
  } catch (error) {
    if (error?.statusCode === 422) {
      return sendError(res, error.message, 422)
    }
    throw error
  }
})

export const listStudentCertificates = asyncHandler(async (req, res) => {
  const certificates = await listCertificatesForStudent(req.user.id)
  return sendSuccess(res, { certificates }, 'Certificates retrieved successfully.')
})

export const getStudentCertificate = asyncHandler(async (req, res) => {
  const certificate = await findCertificateById(req.params.certificateId)
  if (!certificate) return sendError(res, 'Certificate not found.', 404)
  if (String(certificate.studentId) !== String(req.user.id)) return sendError(res, 'You do not have access to this certificate.', 403)
  return sendSuccess(res, { certificate }, 'Certificate retrieved successfully.')
})

export const downloadStudentCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.certificateId).lean()
  if (!certificate) return sendError(res, 'Certificate not found.', 404)
  if (String(certificate.studentId) !== String(req.user.id)) return sendError(res, 'You do not have access to this certificate.', 403)
  if (certificate.status === 'revoked') return sendError(res, 'This certificate has been revoked and is no longer valid.', 403)

  if (certificate.pdfUrl) {
    return res.redirect(certificate.pdfUrl)
  }

  const course = await (await import('../models/Course.js')).Course.findById(certificate.courseId).lean()
  const student = await (await import('../models/User.js')).User.findById(certificate.studentId).lean()
  const instructor = course?.instructorId ? await (await import('../models/User.js')).User.findById(course.instructorId).lean() : null

  const pdfBuffer = await (await import('../services/certificateService.js')).buildCertificatePdfBuffer({
    studentName: student?.name || 'Student',
    courseTitle: course?.title || 'Course',
    instructorName: instructor?.name || null,
    certificateNumber: certificate.certificateNumber,
    verificationCode: certificate.verificationCode,
    issuedAt: certificate.issuedAt || new Date()
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`)
  return res.send(pdfBuffer)
})

export default {
  getStudentCourseCompletion,
  issueStudentCertificate,
  listStudentCertificates,
  getStudentCertificate,
  downloadStudentCertificate
}
