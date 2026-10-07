import mongoose from 'mongoose'
import { Certificate, serializeCertificate } from '../models/Certificate.js'

export const findCertificateByEnrollment = async ({ studentId, courseId, enrollmentId }) => {
  if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(enrollmentId)) return null

  const certificate = await Certificate.findOne({
    studentId: new mongoose.Types.ObjectId(String(studentId)),
    courseId: new mongoose.Types.ObjectId(String(courseId)),
    enrollmentId: new mongoose.Types.ObjectId(String(enrollmentId))
  }).lean()

  return certificate ? serializeCertificate(certificate) : null
}

export const findCertificateById = async (certificateId) => {
  if (!mongoose.isValidObjectId(certificateId)) return null
  const certificate = await Certificate.findById(certificateId).lean()
  return certificate ? serializeCertificate(certificate) : null
}

export const findCertificateByVerificationCode = async (verificationCode) => {
  if (!verificationCode || typeof verificationCode !== 'string') return null
  const certificate = await Certificate.findOne({ verificationCode: verificationCode.trim() }).lean()
  return certificate ? serializeCertificate(certificate) : null
}

export const listCertificatesForStudent = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) return []
  const rows = await Certificate.find({ studentId: new mongoose.Types.ObjectId(String(studentId)) }).sort({ issuedAt: -1, createdAt: -1 }).lean()
  return rows.map(serializeCertificate)
}

export const listCertificatesForAdmin = async ({ search = '', courseId = '', status = 'all', page = 1, limit = 20 } = {}) => {
  const filter = {}
  if (status && status !== 'all') filter.status = status
  if (courseId && mongoose.isValidObjectId(courseId)) filter.courseId = new mongoose.Types.ObjectId(String(courseId))
  if (search) {
    const value = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { certificateNumber: { $regex: value, $options: 'i' } },
      { studentNameSnapshot: { $regex: value, $options: 'i' } },
      { courseTitleSnapshot: { $regex: value, $options: 'i' } }
    ]
  }

  const [totalItems, rows] = await Promise.all([
    Certificate.countDocuments(filter),
    Certificate.find(filter).sort({ issuedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
  ])

  return {
    certificates: rows.map(serializeCertificate),
    totalItems,
    page,
    limit,
    totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : 0
  }
}

export default {
  findCertificateByEnrollment,
  findCertificateById,
  findCertificateByVerificationCode,
  listCertificatesForStudent,
  listCertificatesForAdmin
}
