import mongoose from 'mongoose'

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },

  certificateNumber: { type: String, required: true, unique: true, trim: true, index: true },
  verificationCode: { type: String, required: true, unique: true, trim: true, index: true },

  studentNameSnapshot: { type: String, required: true, trim: true },
  courseTitleSnapshot: { type: String, required: true, trim: true },
  instructorNameSnapshot: { type: String, default: null, trim: true },

  issuedAt: { type: Date, default: Date.now },

  status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  revocationReason: { type: String, default: null, trim: true },

  reissuedAt: { type: Date, default: null },
  reissuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  pdfStorageKey: { type: String, default: null, trim: true },
  pdfUrl: { type: String, default: null, trim: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

certificateSchema.index({ studentId: 1, courseId: 1, enrollmentId: 1 }, { unique: true })

export const serializeCertificate = (value) => {
  const doc = typeof value?.toObject === 'function' ? value.toObject() : (value || {})
  return {
    id: String(doc._id || doc.id),
    studentId: doc.studentId ? String(doc.studentId) : null,
    courseId: doc.courseId ? String(doc.courseId) : null,
    enrollmentId: doc.enrollmentId ? String(doc.enrollmentId) : null,
    certificateNumber: doc.certificateNumber || null,
    verificationCode: doc.verificationCode || null,
    studentNameSnapshot: doc.studentNameSnapshot || '',
    courseTitleSnapshot: doc.courseTitleSnapshot || '',
    instructorNameSnapshot: doc.instructorNameSnapshot || null,
    issuedAt: doc.issuedAt ? new Date(doc.issuedAt).toISOString() : null,
    status: doc.status || 'active',
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
    revokedBy: doc.revokedBy ? String(doc.revokedBy) : null,
    revocationReason: doc.revocationReason || null,
    reissuedAt: doc.reissuedAt ? new Date(doc.reissuedAt).toISOString() : null,
    reissuedBy: doc.reissuedBy ? String(doc.reissuedBy) : null,
    pdfStorageKey: doc.pdfStorageKey || null,
    pdfUrl: doc.pdfUrl || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
  }
}

export const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema)
export default Certificate
