import mongoose from 'mongoose'

export const CAD_PRODUCT_FORMATS = [
  'SLDPRT',
  'SLDASM',
  'STEP',
  'STP',
  'IGES',
  'IGS',
  'Parasolid',
  'STL',
  'DWG',
  'DXF',
  'PDF'
]

const allowedLicenseTypes = ['personal', 'commercial', 'personal_and_commercial']
const allowedProductStatuses = ['draft', 'published', 'archived']

const previewImageSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  alt: { type: String, default: '', trim: true },
  publicId: { type: String, default: null, trim: true },
  sortOrder: { type: Number, default: 0, min: 0, validate: { validator: (value) => Number.isInteger(value) && value >= 0, message: 'Preview image sortOrder must be a non-negative integer.' } }
}, { _id: true })

const secureFileSchema = new mongoose.Schema({
  provider: { type: String, enum: ['cloudinary'], default: 'cloudinary', trim: true },
  publicId: { type: String, default: null, trim: true },
  storageKey: { type: String, default: null, trim: true },
  originalName: { type: String, default: null, trim: true },
  mimeType: { type: String, default: null, trim: true },
  sizeInBytes: { type: Number, default: 0, min: 0 },
  signedUrlTtlSeconds: { type: Number, default: 3600, min: 1 },
  uploadedAt: { type: Date, default: null }
}, { _id: true })

const cadProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  sku: { type: String, default: null, trim: true, unique: true, sparse: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadCategory', required: true, index: true },
  shortDescription: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  software: { type: [String], default: [], validate: { validator: (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0), message: 'At least one software value is required.' } },
  fileFormats: { type: [String], default: [], validate: { validator: (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && CAD_PRODUCT_FORMATS.includes(item.trim().toUpperCase())), message: 'Use supported CAD file formats only.' } },
  highlights: { type: [String], default: [] },
  packageContents: { type: [String], default: [] },
  compatibilityNotes: { type: String, default: null, trim: true },
  originalPriceInPaise: { type: Number, default: null, validate: { validator: (value) => value === null || (Number.isInteger(value) && value >= 0), message: 'Original price must be a non-negative integer in paise.' } },
  salePriceInPaise: { type: Number, required: true, validate: { validator: (value) => Number.isInteger(value) && value >= 0, message: 'Sale price must be a non-negative integer in paise.' } },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  isFree: { type: Boolean, default: false },
  previewImages: { type: [previewImageSchema], default: [] },
  secureFile: { type: secureFileSchema, default: null },
  previewVideoUrl: { type: String, default: null, trim: true },
  licenseType: { type: String, enum: allowedLicenseTypes, default: 'personal_and_commercial' },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: allowedProductStatuses, default: 'draft', index: true },
  seoTitle: { type: String, default: null, trim: true },
  seoDescription: { type: String, default: null, trim: true },
  publishedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false })

cadProductSchema.index({ title: 'text', shortDescription: 'text', description: 'text', slug: 'text' })

export const serializeCadProduct = (product, { includeSecureFile = false } = {}) => {
  const value = typeof product.toObject === 'function' ? product.toObject() : product
  const category = value.categoryId && typeof value.categoryId === 'object' ? value.categoryId : null
  const previewImages = Array.isArray(value.previewImages) ? value.previewImages.map((image) => ({
    id: image._id ? String(image._id) : null,
    url: image.url || '',
    alt: image.alt || '',
    publicId: image.publicId || null,
    sortOrder: Number.isInteger(image.sortOrder) ? image.sortOrder : 0
  })) : []

  const secureFile = value.secureFile && includeSecureFile ? {
    provider: value.secureFile.provider || 'cloudinary',
    publicId: value.secureFile.publicId || null,
    storageKey: value.secureFile.storageKey || null,
    originalName: value.secureFile.originalName || null,
    mimeType: value.secureFile.mimeType || null,
    sizeInBytes: Number.isFinite(value.secureFile.sizeInBytes) ? Number(value.secureFile.sizeInBytes) : 0,
    signedUrlTtlSeconds: Number.isFinite(value.secureFile.signedUrlTtlSeconds) ? Number(value.secureFile.signedUrlTtlSeconds) : 3600,
    uploadedAt: value.secureFile.uploadedAt ? new Date(value.secureFile.uploadedAt).toISOString() : null,
  } : null

  return {
    id: String(value._id || value.id),
    title: value.title,
    slug: value.slug,
    sku: value.sku || null,
    categoryId: category ? String(category._id || category.id) : value.categoryId ? String(value.categoryId) : null,
    category: category ? {
      id: String(category._id || category.id),
      name: category.name,
      slug: category.slug,
      isActive: Boolean(category.isActive)
    } : null,
    shortDescription: value.shortDescription,
    description: value.description,
    software: Array.isArray(value.software) ? value.software.map((entry) => String(entry).trim()).filter(Boolean) : [],
    fileFormats: Array.isArray(value.fileFormats) ? value.fileFormats.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean) : [],
    highlights: Array.isArray(value.highlights) ? value.highlights.map((entry) => String(entry).trim()).filter(Boolean) : [],
    packageContents: Array.isArray(value.packageContents) ? value.packageContents.map((entry) => String(entry).trim()).filter(Boolean) : [],
    compatibilityNotes: value.compatibilityNotes || null,
    originalPriceInPaise: Number.isInteger(value.originalPriceInPaise) ? value.originalPriceInPaise : null,
    salePriceInPaise: Number.isInteger(value.salePriceInPaise) ? value.salePriceInPaise : 0,
    currency: value.currency || 'INR',
    isFree: Boolean(value.isFree),
    previewImages,
    previewVideoUrl: value.previewVideoUrl || null,
    secureFile: includeSecureFile ? secureFile : undefined,
    licenseType: value.licenseType || 'personal_and_commercial',
    featured: Boolean(value.featured),
    status: value.status || 'draft',
    seoTitle: value.seoTitle || null,
    seoDescription: value.seoDescription || null,
    publishedAt: value.publishedAt ? new Date(value.publishedAt).toISOString() : null,
    archivedAt: value.archivedAt ? new Date(value.archivedAt).toISOString() : null,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null,
  }
}

export const CadProduct = mongoose.models.CadProduct || mongoose.model('CadProduct', cadProductSchema)
export default CadProduct
