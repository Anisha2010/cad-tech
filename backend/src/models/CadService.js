import mongoose from 'mongoose'

const cadServiceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  shortDescription: { type: String, required: true, trim: true, maxlength: 280 },
  description: { type: String, required: true, trim: true },
  category: { type: String, default: 'General CAD', trim: true, maxlength: 80 },
  features: { type: [String], default: [] },
  deliverables: { type: [String], default: [] },
  supportedSoftware: { type: [String], default: [] },
  thumbnail: { type: String, default: null, trim: true },
  startingPriceInPaise: { type: Number, default: null, min: 0 },
  estimatedDeliveryDays: { type: Number, default: null, min: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  displayOrder: { type: Number, default: 0, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true, versionKey: false })

export const serializeCadService = (service) => {
  const value = typeof service.toObject === 'function' ? service.toObject() : service
  return {
    id: String(value._id || value.id),
    title: value.title || '',
    slug: value.slug || '',
    shortDescription: value.shortDescription || '',
    description: value.description || '',
    category: value.category || 'General CAD',
    features: Array.isArray(value.features) ? value.features.map((entry) => String(entry).trim()).filter(Boolean) : [],
    deliverables: Array.isArray(value.deliverables) ? value.deliverables.map((entry) => String(entry).trim()).filter(Boolean) : [],
    supportedSoftware: Array.isArray(value.supportedSoftware) ? value.supportedSoftware.map((entry) => String(entry).trim()).filter(Boolean) : [],
    thumbnail: value.thumbnail || null,
    startingPriceInPaise: Number.isInteger(value.startingPriceInPaise) ? value.startingPriceInPaise : null,
    estimatedDeliveryDays: Number.isInteger(value.estimatedDeliveryDays) ? value.estimatedDeliveryDays : null,
    status: value.status || 'draft',
    displayOrder: Number.isInteger(value.displayOrder) ? value.displayOrder : 0,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null,
  }
}

export const CadService = mongoose.models.CadService || mongoose.model('CadService', cadServiceSchema)

export default CadService
