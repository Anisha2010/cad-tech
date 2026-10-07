import mongoose from 'mongoose'

const homepageContentSchema = new mongoose.Schema({
  heroTitle: { type: String, required: true, trim: true, default: 'Learn CAD. Design with confidence.' },
  heroSubtitle: { type: String, trim: true, default: 'Practical engineering training, CAD models, and expert support for students and businesses.' },
  heroPrimaryCtaLabel: { type: String, trim: true, default: 'Explore Courses' },
  heroPrimaryCtaLink: { type: String, trim: true, default: '/courses' },
  heroSecondaryCtaLabel: { type: String, trim: true, default: 'Contact Us' },
  heroSecondaryCtaLink: { type: String, trim: true, default: '/contact' },
  stats: { type: [String], default: ['2000+ learners', '40+ CAD courses', '15+ design categories'] },
  featureHighlights: { type: [String], default: ['Structured Learning', 'Industry-specific CAD guidance', 'Project-focused support'] },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

export const HomepageContent = mongoose.models.HomepageContent || mongoose.model('HomepageContent', homepageContentSchema)
export default HomepageContent
