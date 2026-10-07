import mongoose from 'mongoose'

const siteSettingsSchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true, default: 'CadTech Solution' },
  brandName: { type: String, trim: true, default: 'CadTech Solution' },
  tagline: { type: String, trim: true, default: 'Professional CAD models, engineering services, and practical training.' },
  contactEmail: { type: String, trim: true, default: 'arvind@cadtechsolution.com' },
  contactPhone: { type: String, trim: true, default: '+91 8839989046' },
  contactAddress: { type: String, trim: true, default: 'Bengaluru, India' },
  primaryCtaLabel: { type: String, trim: true, default: 'Explore Courses' },
  primaryCtaLink: { type: String, trim: true, default: '/courses' },
  secondaryCtaLabel: { type: String, trim: true, default: 'Request a Quote' },
  secondaryCtaLink: { type: String, trim: true, default: '/contact' },
  metaTitle: { type: String, trim: true, default: 'CadTech Solution | CAD Training and Design Services' },
  metaDescription: { type: String, trim: true, default: 'Learn CAD, access engineering resources, and request professional design support.' },
  isActive: { type: Boolean, default: true },
  heroImageUrl: { type: String, trim: true, default: '' },
  founderImageUrl: { type: String, trim: true, default: '' },
  socialLinks: {
    type: {
      facebook: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' }
    },
    default: {}
  }
}, { timestamps: true, versionKey: false })

export const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema)
export default SiteSettings
