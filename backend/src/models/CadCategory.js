import mongoose from 'mongoose'

const cadCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  description: { type: String, default: null, trim: true },
  imageUrl: { type: String, default: null },
  icon: { type: String, default: null },
  sortOrder: { type: Number, default: 0, min: 0, validate: { validator: (value) => Number.isInteger(value) && value >= 0, message: 'sortOrder must be a non-negative integer.' } },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false })

cadCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 })

export const serializeCadCategory = (category) => {
  const value = typeof category.toObject === 'function' ? category.toObject() : category
  return {
    id: String(value._id || value.id),
    name: value.name,
    slug: value.slug,
    description: value.description || null,
    imageUrl: value.imageUrl || null,
    icon: value.icon || null,
    sortOrder: Number.isInteger(value.sortOrder) ? value.sortOrder : 0,
    isActive: Boolean(value.isActive),
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null,
  }
}

export const CadCategory = mongoose.models.CadCategory || mongoose.model('CadCategory', cadCategorySchema)
export default CadCategory
