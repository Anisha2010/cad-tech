import crypto from 'crypto'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import PDFDocument from 'pdfkit'
import { Course } from '../models/Course.js'
import { User } from '../models/User.js'
import { Enrollment } from '../models/Enrollment.js'
import { Certificate } from '../models/Certificate.js'
import { findCertificateByEnrollment, findCertificateByVerificationCode } from '../repositories/certificateRepository.js'
import { calculateCourseCompletion } from './courseCompletionService.js'
import { AppError } from '../utils/AppError.js'

const isStorageConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

const generateSecureCode = (length = 10) => crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase()

const generateCertificateNumber = () => {
  const year = new Date().getFullYear()
  return `CTS-${year}-${generateSecureCode(8)}`
}

const normalizePublicUrl = (value) => {
  if (!value || typeof value !== 'string') return null
  const text = value.trim()
  return text.startsWith('http://') || text.startsWith('https://') ? text : null
}

const publicVerificationUrl = (code) => `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/certificates/verify/${encodeURIComponent(code)}`

export const buildCertificatePdfBuffer = ({ studentName, courseTitle, instructorName, certificateNumber, verificationCode, issuedAt }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 32, right: 36, bottom: 32, left: 36 } })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (error) => reject(error))

    doc.fillColor('#0F172A').fontSize(34).text('Certificate of Completion', { align: 'center' })
    doc.moveDown(0.8)
    doc.fillColor('#2563EB').fontSize(14).text('CadTech Solution', { align: 'center' })
    doc.moveDown(1.4)
    doc.fillColor('#1E293B').fontSize(22).text('This certifies that', { align: 'center' })
    doc.moveDown(0.5)
    doc.fillColor('#0F172A').fontSize(28).text(studentName || 'Student Name', { align: 'center' })
    doc.moveDown(0.9)
    doc.fillColor('#1E293B').fontSize(18).text('has successfully completed', { align: 'center' })
    doc.moveDown(0.4)
    doc.fillColor('#0F172A').fontSize(24).text(courseTitle || 'Course Title', { align: 'center' })

    if (instructorName) {
      doc.moveDown(0.9)
      doc.fillColor('#64748B').fontSize(14).text(`Instructor: ${instructorName}`, { align: 'center' })
    }

    doc.moveDown(1.2)
    doc.fillColor('#64748B').fontSize(12).text(`Certificate Number: ${certificateNumber || 'CTS-0000-0000'}`)
    doc.text(`Verification Code: ${verificationCode || 'N/A'}`)
    doc.text(`Issued: ${issuedAt ? new Date(issuedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Today'}`)
    doc.text(`Verification URL: ${publicVerificationUrl(verificationCode || 'verify')}`)

    doc.moveDown(1)
    doc.fillColor('#0F172A').fontSize(12).text('Authorized by CadTech Solution', 60, doc.y, { align: 'left' })
    doc.fillColor('#06B6D4').fontSize(11).text('Professional Training & Certification', 60, doc.y + 18, { align: 'left' })

    doc.end()
  })
}

const uploadCertificatePdf = async ({ buffer, certificateNumber }) => {
  if (!isStorageConfigured()) return { pdfStorageKey: null, pdfUrl: null }

  const folderName = 'cadtech/certificates'
  const safeName = `${certificateNumber || 'certificate'}-${Date.now()}`

  const result = await cloudinary.uploader.upload_stream({
    resource_type: 'raw',
    folder: folderName,
    public_id: safeName,
    format: 'pdf'
  }, (error, upload) => {
    if (error) throw new Error('Certificate PDF could not be stored.')
    return upload
  })

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'raw',
      folder: folderName,
      public_id: safeName,
      format: 'pdf'
    }, (error, upload) => {
      if (error) {
        reject(new Error('Certificate PDF could not be stored.'))
        return
      }
      resolve({
        pdfStorageKey: upload?.public_id || null,
        pdfUrl: normalizePublicUrl(upload?.secure_url || upload?.url) || null
      })
    })
    stream.end(buffer)
  })
}

export const issueCertificateFromEnrollment = async ({ studentId, courseId, enrollmentId, actorId = null }) => {
  if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(enrollmentId)) {
    throw new AppError('Invalid certificate data.', 400)
  }

  const course = await Course.findById(courseId).lean()
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, userId: studentId, courseId }).lean()
  if (!course) throw new AppError('Course not found.', 404)
  if (!enrollment || !['active', 'completed'].includes(enrollment.status)) throw new AppError('Enrollment is inactive or invalid.', 403)

  const completion = await calculateCourseCompletion({ studentId, courseId, enrollment })
  if (!completion.eligible) {
    throw new AppError('Complete all required course activities before requesting your certificate.', 422)
  }

  const student = await User.findById(studentId).lean()
  const instructor = course.instructorId ? await User.findById(course.instructorId).lean() : null

  const existing = await findCertificateByEnrollment({ studentId, courseId, enrollmentId })
  if (existing && existing.status === 'active') {
    return { certificate: existing, created: false, completion }
  }

  const now = new Date()
  const certificateNumber = generateCertificateNumber()
  const verificationCode = generateSecureCode(12)

  const pdfBuffer = await buildCertificatePdfBuffer({
    studentName: student?.name || 'Student',
    courseTitle: course.title || 'Course',
    instructorName: instructor?.name || null,
    certificateNumber,
    verificationCode,
    issuedAt: now
  })

  const storage = await uploadCertificatePdf({ buffer: pdfBuffer, certificateNumber })

  try {
    const created = await Certificate.create({
      studentId: new mongoose.Types.ObjectId(String(studentId)),
      courseId: new mongoose.Types.ObjectId(String(courseId)),
      enrollmentId: new mongoose.Types.ObjectId(String(enrollmentId)),
      certificateNumber,
      verificationCode,
      studentNameSnapshot: student?.name || 'Student',
      courseTitleSnapshot: course.title || 'Course',
      instructorNameSnapshot: instructor?.name || null,
      issuedAt: now,
      status: 'active',
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      reissuedAt: null,
      reissuedBy: null,
      pdfStorageKey: storage.pdfStorageKey || null,
      pdfUrl: storage.pdfUrl || null,
      createdAt: now,
      updatedAt: now
    })

    await Enrollment.findByIdAndUpdate(enrollmentId, {
      $set: {
        status: 'completed',
        progressPercentage: 100,
        completedAt: now,
        lastAccessedAt: now,
        updatedAt: now
      }
    }, { runValidators: true })

    return { certificate: created.toObject ? created.toObject() : created, created: true, completion }
  } catch (error) {
    if (error?.code === 11000) {
      const certificate = await findCertificateByEnrollment({ studentId, courseId, enrollmentId })
      return { certificate, created: false, completion }
    }
    throw error
  }
}

export const reissueCertificate = async ({ certificateId, adminId, reason = 'Administrative reissue' }) => {
  if (!mongoose.isValidObjectId(certificateId)) throw new AppError('Invalid certificate reference.', 400)
  if (!mongoose.isValidObjectId(adminId)) throw new AppError('Invalid admin reference.', 400)

  const certificate = await Certificate.findById(certificateId).lean()
  if (!certificate) throw new AppError('Certificate not found.', 404)

  const [course, student, enrollment] = await Promise.all([
    Course.findById(certificate.courseId).lean(),
    User.findById(certificate.studentId).lean(),
    Enrollment.findOne({ _id: certificate.enrollmentId, userId: certificate.studentId }).lean()
  ])

  if (!course || !student || !enrollment) throw new AppError('Certificate data is incomplete.', 404)

  const completion = await calculateCourseCompletion({ studentId: certificate.studentId, courseId: certificate.courseId, enrollment })
  if (!completion.eligible) throw new AppError('The enrollment no longer qualifies for a certificate.', 422)

  const now = new Date()
  const pdfBuffer = await buildCertificatePdfBuffer({
    studentName: student.name || 'Student',
    courseTitle: course.title || 'Course',
    instructorName: course.instructorId ? (await User.findById(course.instructorId).lean())?.name || null : null,
    certificateNumber: certificate.certificateNumber,
    verificationCode: certificate.verificationCode,
    issuedAt: certificate.issuedAt || now
  })

  const storage = await uploadCertificatePdf({ buffer: pdfBuffer, certificateNumber: certificate.certificateNumber })

  const updated = await Certificate.findByIdAndUpdate(certificateId, {
    $set: {
      status: 'active',
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      reissuedAt: now,
      reissuedBy: new mongoose.Types.ObjectId(String(adminId)),
      pdfStorageKey: storage.pdfStorageKey || certificate.pdfStorageKey || null,
      pdfUrl: storage.pdfUrl || certificate.pdfUrl || null,
      updatedAt: now
    }
  }, { new: true, runValidators: true }).lean()

  return { certificate: updated, reason }
}

export const verifyCertificate = async (verificationCode) => {
  const code = String(verificationCode || '').trim()
  if (!code || !/^[A-Z0-9-]+$/i.test(code)) {
    return { valid: false, status: 'not_found', certificateNumber: null, courseTitle: null, issuedAt: null }
  }

  const certificate = await findCertificateByVerificationCode(code)
  if (!certificate) {
    return { valid: false, status: 'not_found', certificateNumber: null, courseTitle: null, issuedAt: null }
  }

  if (certificate.status === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      certificateNumber: certificate.certificateNumber,
      courseTitle: certificate.courseTitleSnapshot,
      issuedAt: certificate.issuedAt
    }
  }

  return {
    valid: true,
    status: 'active',
    certificateNumber: certificate.certificateNumber,
    studentName: certificate.studentNameSnapshot,
    courseTitle: certificate.courseTitleSnapshot,
    issuedAt: certificate.issuedAt
  }
}

export default {
  issueCertificateFromEnrollment,
  reissueCertificate,
  verifyCertificate,
  generateCertificateNumber,
  publicVerificationUrl
}
