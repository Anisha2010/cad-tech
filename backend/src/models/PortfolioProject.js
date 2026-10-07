import mongoose from 'mongoose'

const portfolioProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, trim: true, default: 'General' },
  summary: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  projectUrl: { type: String, trim: true, default: '' },
  technologies: { type: [String], default: [] },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const PortfolioProject = mongoose.models.PortfolioProject || mongoose.model('PortfolioProject', portfolioProjectSchema)
export default PortfolioProject
