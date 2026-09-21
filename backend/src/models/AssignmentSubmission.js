import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  provider: { type: String, default: 'cloudinary', trim: true },
  storageKey: { type: String, default: '', trim: true },
  publicId: { type: String, default: null, trim: true },
  url: { type: String, required: true, trim: true },
  originalName: { type: String, default: '', trim: true },
  mimeType: { type: String, default: '', trim: true },
  size: { type: Number, default: 0, min: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true })

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
  revisionNumber: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'late', 'under_review', 'graded', 'resubmission_requested'],
    default: 'draft',
    index: true
  },
  textAnswer: { type: String, default: '' },
  attachments: { type: [attachmentSchema], default: [] },
  dueDateSnapshot: { type: Date, default: null },
  isLate: { type: Boolean, default: false },
  submittedAt: { type: Date, default: null },
  maximumMarksSnapshot: { type: Number, default: 0, min: 0 },
  marksAwarded: { type: Number, default: null, min: 0 },
  feedback: { type: String, default: null },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  gradedAt: { type: Date, default: null },
  resubmissionReason: { type: String, default: null },
  resubmissionRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resubmissionRequestedAt: { type: Date, default: null },
  supersedesSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignmentSubmission', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

assignmentSubmissionSchema.index({ studentId: 1, assignmentId: 1, revisionNumber: 1 }, { unique: true })
assignmentSubmissionSchema.index({ studentId: 1, assignmentId: 1, createdAt: -1 })
assignmentSubmissionSchema.index({ courseId: 1, status: 1, submittedAt: -1 })
assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1, status: 1 })

export const serializeAssignmentSubmission = (value) => {
  const doc = typeof value?.toObject === 'function' ? value.toObject() : (value || {})
  return {
    id: String(doc._id || doc.id),
    assignmentId: doc.assignmentId ? String(doc.assignmentId) : null,
    courseId: doc.courseId ? String(doc.courseId) : null,
    studentId: doc.studentId ? String(doc.studentId) : null,
    enrollmentId: doc.enrollmentId ? String(doc.enrollmentId) : null,
    revisionNumber: Number(doc.revisionNumber || 1),
    status: doc.status || 'draft',
    textAnswer: typeof doc.textAnswer === 'string' ? doc.textAnswer : '',
    attachments: Array.isArray(doc.attachments) ? doc.attachments.map((attachment) => ({
      id: String(attachment._id || attachment.id),
      provider: attachment.provider || 'cloudinary',
      storageKey: attachment.storageKey || '',
      publicId: attachment.publicId || null,
      url: attachment.url || '',
      originalName: attachment.originalName || '',
      mimeType: attachment.mimeType || '',
      size: Number(attachment.size || 0),
      uploadedAt: attachment.uploadedAt ? new Date(attachment.uploadedAt).toISOString() : null
    })) : [],
    dueDateSnapshot: doc.dueDateSnapshot ? new Date(doc.dueDateSnapshot).toISOString() : null,
    isLate: Boolean(doc.isLate),
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).toISOString() : null,
    maximumMarksSnapshot: Number(doc.maximumMarksSnapshot || 0),
    marksAwarded: doc.marksAwarded === null || doc.marksAwarded === undefined ? null : Number(doc.marksAwarded),
    feedback: doc.feedback ?? null,
    gradedBy: doc.gradedBy ? String(doc.gradedBy) : null,
    gradedAt: doc.gradedAt ? new Date(doc.gradedAt).toISOString() : null,
    resubmissionReason: doc.resubmissionReason ?? null,
    resubmissionRequestedBy: doc.resubmissionRequestedBy ? String(doc.resubmissionRequestedBy) : null,
    resubmissionRequestedAt: doc.resubmissionRequestedAt ? new Date(doc.resubmissionRequestedAt).toISOString() : null,
    supersedesSubmissionId: doc.supersedesSubmissionId ? String(doc.supersedesSubmissionId) : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
  }
}

export const AssignmentSubmission = mongoose.models.AssignmentSubmission || mongoose.model('AssignmentSubmission', assignmentSubmissionSchema)
export default AssignmentSubmission
