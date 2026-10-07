import mongoose from 'mongoose'

const aboutContentSchema = new mongoose.Schema({
  pageTitle: { type: String, trim: true, default: 'About CadTech Solution' },
  intro: { type: String, trim: true, default: 'CadTech Solution brings together practical CAD training, organized design resources, and engineering services.' },
  mission: { type: String, trim: true, default: 'Make professional CAD knowledge and engineering support easier to access for learners and businesses.' },
  vision: { type: String, trim: true, default: 'Build a practical digital platform where engineering education and design resources work together.' },
  supportAreas: { type: [String], default: ['CAD models', 'engineering services', 'professional training'] },
  values: { type: [String], default: ['Practical learning', 'Accessible resources', 'Quality design'] },
  finalCta: { type: String, trim: true, default: 'Ready to start your CAD journey?' },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const AboutContent = mongoose.models.AboutContent || mongoose.model('AboutContent', aboutContentSchema)
export default AboutContent
