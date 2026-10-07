import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema({
  storageProvider: { type: String, default: 'cloudinary', trim: true },
  storageAssetId: { type: String, default: null, trim: true },
  originalFileName: { type: String, required: true, trim: true },
  extension: { type: String, default: '', trim: true },
  mimeType: { type: String, default: '', trim: true },
  sizeBytes: { type: Number, default: 0, min: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true })

const cadServiceEnquirySchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true, trim: true, index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadService', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  customerPhone: { type: String, default: null, trim: true },
  projectTitle: { type: String, required: true, trim: true },
  projectDescription: { type: String, required: true, trim: true },
  preferredSoftware: { type: String, default: null, trim: true },
  requiredFileFormats: { type: [String], default: [] },
  expectedDeliveryDate: { type: Date, default: null },
  budgetInPaise: { type: Number, default: null, min: 0 },
  attachments: { type: [attachmentSchema], default: [] },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'clarification_required', 'quoted', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'],
    default: 'submitted',
    index: true
  },
  adminAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
}, { timestamps: true, versionKey: false })

export const CadServiceEnquiry = mongoose.models.CadServiceEnquiry || mongoose.model('CadServiceEnquiry', cadServiceEnquirySchema)
export default CadServiceEnquiry
