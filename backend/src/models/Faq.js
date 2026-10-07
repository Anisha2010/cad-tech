import mongoose from 'mongoose'

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  category: { type: String, trim: true, default: 'general' },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const Faq = mongoose.models.Faq || mongoose.model('Faq', faqSchema)
export default Faq
