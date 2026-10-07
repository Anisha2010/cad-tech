import mongoose from 'mongoose'

const cadServiceQuotationSchema = new mongoose.Schema({
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadServiceEnquiry', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  amountInPaise: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  scopeOfWork: { type: String, required: true, trim: true },
  deliverables: { type: [String], default: [] },
  estimatedDeliveryDays: { type: Number, required: true, min: 1 },
  terms: { type: [String], default: [] },
  validUntil: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'declined', 'expired', 'superseded'],
    default: 'draft',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sentAt: { type: Date, default: null },
  respondedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })

cadServiceQuotationSchema.index({ enquiryId: 1, version: 1 }, { unique: true })

export const CadServiceQuotation = mongoose.models.CadServiceQuotation || mongoose.model('CadServiceQuotation', cadServiceQuotationSchema)
export default CadServiceQuotation
