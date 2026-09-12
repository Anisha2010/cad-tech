import mongoose from 'mongoose'

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, enum: ['razorpay'], required: true },
  eventId: { type: String, required: true, trim: true },
  eventType: { type: String, required: true, trim: true },
  status: { type: String, enum: ['processing', 'processed', 'failed'], default: 'processing' },
  processedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true })

export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema)
export default WebhookEvent