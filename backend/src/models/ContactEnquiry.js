import mongoose from 'mongoose'

const contactEnquirySchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: null, trim: true },
  inquiryType: { type: String, required: true, trim: true, default: 'general' },
  serviceSlug: { type: String, default: null, trim: true },
  courseSlug: { type: String, default: null, trim: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  sourcePage: { type: String, default: 'website', trim: true },
  status: { type: String, enum: ['new', 'in_review', 'responded', 'closed', 'spam'], default: 'new', index: true },
  isRead: { type: Boolean, default: false },
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  adminNotes: { type: String, default: '', trim: true },
  source: { type: String, trim: true, default: 'website' },
  honeypot: { type: String, default: '', trim: true }
}, { timestamps: true, versionKey: false })

export const ContactEnquiry = mongoose.models.ContactEnquiry || mongoose.model('ContactEnquiry', contactEnquirySchema)
export default ContactEnquiry
