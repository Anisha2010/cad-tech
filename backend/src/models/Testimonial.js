import mongoose from 'mongoose'

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  quote: { type: String, required: true, trim: true },
  initials: { type: String, trim: true, default: '' },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema)
export default Testimonial
