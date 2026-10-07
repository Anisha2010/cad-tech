import mongoose from 'mongoose'

const cadServiceMessageSchema = new mongoose.Schema({
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadServiceEnquiry', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderRole: { type: String, required: true, trim: true, enum: ['student', 'admin'] },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  attachments: { type: [String], default: [] },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })

export const CadServiceMessage = mongoose.models.CadServiceMessage || mongoose.model('CadServiceMessage', cadServiceMessageSchema)
export default CadServiceMessage
