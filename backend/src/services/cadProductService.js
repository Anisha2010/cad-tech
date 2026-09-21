import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { CadCategory } from '../models/CadCategory.js'
import { CadProduct, CAD_PRODUCT_FORMATS } from '../models/CadProduct.js'
import {
  archiveCadProductRecord,
  createCadProductRecord,
  findCadProductById,
  getAdminCadProducts,
  getCadProductBySlug,
  getPublishedCadProducts,
  productSlugExists,
  productSkuExists,
  publishCadProductRecord,
  unpublishCadProductRecord,
  updateCadProductRecord
} from '../repositories/cadProductRepository.js'

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

const normalizeArray = (value, maxItems = 25) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, maxItems)
}

const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)

const normalizePrice = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

const safeUrl = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

const toValidPreviewImages = (images = []) => {
  if (!Array.isArray(images)) return []
  return images
    .map((image, index) => {
      const url = safeUrl(image?.url)
      if (!url) return null
      return {
        url,
        alt: normalizeString(image?.alt, ''),
        publicId: typeof image?.publicId === 'string' ? image.publicId.trim() : null,
        sortOrder: Number.isInteger(Number(image?.sortOrder)) ? Number(image.sortOrder) : index
      }
    })
    .filter(Boolean)
    .slice(0, 12)
}

const validateProductPayload = ({ title, slug, categoryId, shortDescription, description, software, fileFormats, originalPriceInPaise, salePriceInPaise, isFree, licenseType, previewImages, packageContents, status }) => {
  const fieldErrors = []

  if (!title || !title.trim()) fieldErrors.push({ field: 'title', message: 'Product title is required.' })
  if (!slug || !slug.trim()) fieldErrors.push({ field: 'slug', message: 'Slug is required.' })
  if (!categoryId || !mongoose.isValidObjectId(categoryId)) fieldErrors.push({ field: 'categoryId', message: 'Valid category is required.' })
  if (!shortDescription || !shortDescription.trim()) fieldErrors.push({ field: 'shortDescription', message: 'Short description is required.' })
  if (!description || !description.trim()) fieldErrors.push({ field: 'description', message: 'Full description is required.' })
  if (!Array.isArray(software) || software.length === 0 || software.some((entry) => !String(entry).trim())) fieldErrors.push({ field: 'software', message: 'Add at least one supported software option.' })
  if (!Array.isArray(fileFormats) || fileFormats.length === 0 || fileFormats.some((entry) => !String(entry).trim())) fieldErrors.push({ field: 'fileFormats', message: 'Add at least one supported file format.' })
  if (!Array.isArray(packageContents) || packageContents.length === 0 || packageContents.some((entry) => !String(entry).trim())) fieldErrors.push({ field: 'packageContents', message: 'Add at least one package content item.' })
  if (!Array.isArray(previewImages) || previewImages.length === 0) fieldErrors.push({ field: 'previewImages', message: 'At least one preview image is required.' })
  if (licenseType && !['personal', 'commercial', 'personal_and_commercial'].includes(licenseType)) fieldErrors.push({ field: 'licenseType', message: 'Select a valid license type.' })

  if (Boolean(isFree)) {
    if (salePriceInPaise !== 0) fieldErrors.push({ field: 'salePriceInPaise', message: 'Free products must have a sale price of 0 paise.' })
  } else {
    if (!Number.isInteger(salePriceInPaise) || salePriceInPaise <= 0) {
      fieldErrors.push({ field: 'salePriceInPaise', message: 'Paid products require a positive integer sale price in paise.' })
    }
  }

  if (Number.isInteger(originalPriceInPaise) && Number(originalPriceInPaise) < Number(salePriceInPaise)) {
    fieldErrors.push({ field: 'originalPriceInPaise', message: 'Original price cannot be lower than the sale price.' })
  }

  if (status === 'published') {
    if (!categoryId || !mongoose.isValidObjectId(categoryId)) fieldErrors.push({ field: 'categoryId', message: 'Active category is required to publish.' })
    else {
      const category = CadCategory.findById(categoryId).lean()
      if (!category) {
        fieldErrors.push({ field: 'categoryId', message: 'Selected category is not valid.' })
      }
    }
  }

  return fieldErrors
}

export const getPublicCadProductList = async (filters = {}) => getPublishedCadProducts({
  search: typeof filters.search === 'string' ? filters.search : '',
  category: typeof filters.category === 'string' ? filters.category : '',
  software: typeof filters.software === 'string' ? filters.software : '',
  format: typeof filters.format === 'string' ? filters.format : '',
  pricing: typeof filters.pricing === 'string' ? filters.pricing : 'all',
  featured: Boolean(filters.featured),
  sort: typeof filters.sort === 'string' ? filters.sort : 'newest',
  page: Number(filters.page || 1),
  limit: Number(filters.limit || 12)
})

export const getPublicCadProductDetail = async (slug) => getCadProductBySlug(slug, { includeArchived: false, includeDraft: false })

export const getAdminCadProductList = async (filters = {}) => getAdminCadProducts({
  search: typeof filters.search === 'string' ? filters.search : '',
  status: typeof filters.status === 'string' ? filters.status : 'all',
  category: typeof filters.category === 'string' ? filters.category : '',
  featured: typeof filters.featured === 'string' ? filters.featured : filters.featured,
  page: Number(filters.page || 1),
  limit: Number(filters.limit || 12)
})

export const getCadProductAdminDetail = async (productId) => findCadProductById(productId)

export const createCadProduct = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const title = normalizeString(payload.title)
  const categoryId = payload.categoryId
  const shortDescription = normalizeString(payload.shortDescription)
  const description = normalizeString(payload.description)
  const software = normalizeArray(payload.software)
  const fileFormats = normalizeArray(payload.fileFormats).map((item) => item.toUpperCase())
  const packageContents = normalizeArray(payload.packageContents)
  const previewImages = toValidPreviewImages(payload.previewImages)
  const originalPriceInPaise = normalizePrice(payload.originalPriceInPaise)
  const salePriceInPaise = normalizePrice(payload.salePriceInPaise)
  const isFree = Boolean(payload.isFree)
  const licenseType = typeof payload.licenseType === 'string' ? payload.licenseType : 'personal_and_commercial'

  const fieldErrors = validateProductPayload({
    title,
    slug: slugify(payload.slug || title),
    categoryId,
    shortDescription,
    description,
    software,
    fileFormats,
    packageContents,
    originalPriceInPaise,
    salePriceInPaise: isFree ? 0 : (salePriceInPaise ?? 0),
    isFree,
    licenseType,
    previewImages,
    status: 'draft'
  })

  if (fieldErrors.length) {
    const first = fieldErrors[0]
    throw new AppError(first.message, 400)
  }

  if (!categoryId || !mongoose.isValidObjectId(categoryId)) throw new AppError('Valid category is required.', 400)
  const category = await CadCategory.findById(categoryId).lean()
  if (!category || !category.isActive) throw new AppError('Selected category is not active.', 400)

  const slug = slugify(payload.slug || title)
  if (!slug) throw new AppError('Product title is required.', 400)
  if (await productSlugExists(slug)) throw new AppError('A product with this slug already exists.', 409)
  if (payload.sku && await productSkuExists(payload.sku)) throw new AppError('A product with this SKU already exists.', 409)

  const product = await createCadProductRecord({
    title,
    slug,
    sku: payload.sku ? String(payload.sku).trim() : null,
    categoryId,
    shortDescription,
    description,
    software,
    fileFormats,
    highlights: normalizeArray(payload.highlights),
    packageContents,
    compatibilityNotes: normalizeString(payload.compatibilityNotes),
    originalPriceInPaise: originalPriceInPaise === null ? null : originalPriceInPaise,
    salePriceInPaise: isFree ? 0 : (salePriceInPaise ?? 0),
    currency: 'INR',
    isFree,
    previewImages,
    previewVideoUrl: safeUrl(payload.previewVideoUrl),
    licenseType,
    featured: Boolean(payload.featured),
    status: 'draft',
    sebTitle: null,
    seoDescription: null,
    createdBy: userId,
    updatedBy: userId,
  })

  return product
}

export const updateCadProduct = async ({ productId, userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(productId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadProductById(productId)
  if (!existing) return null

  const title = payload.title !== undefined ? normalizeString(payload.title) : existing.title
  const categoryId = payload.categoryId !== undefined ? payload.categoryId : existing.categoryId
  const shortDescription = payload.shortDescription !== undefined ? normalizeString(payload.shortDescription) : existing.shortDescription
  const description = payload.description !== undefined ? normalizeString(payload.description) : existing.description
  const software = payload.software !== undefined ? normalizeArray(payload.software) : existing.software
  const fileFormats = payload.fileFormats !== undefined ? normalizeArray(payload.fileFormats).map((entry) => entry.toUpperCase()) : existing.fileFormats
  const packageContents = payload.packageContents !== undefined ? normalizeArray(payload.packageContents) : existing.packageContents
  const previewImages = payload.previewImages !== undefined ? toValidPreviewImages(payload.previewImages) : existing.previewImages
  const originalPriceInPaise = payload.originalPriceInPaise !== undefined ? normalizePrice(payload.originalPriceInPaise) : existing.originalPriceInPaise
  const salePriceInPaise = payload.salePriceInPaise !== undefined ? normalizePrice(payload.salePriceInPaise) : existing.salePriceInPaise
  const isFree = payload.isFree !== undefined ? Boolean(payload.isFree) : existing.isFree
  const licenseType = payload.licenseType !== undefined ? (typeof payload.licenseType === 'string' ? payload.licenseType : existing.licenseType) : existing.licenseType

  const draftSlug = payload.slug !== undefined ? slugify(payload.slug || title) : existing.slug
  if (!title) throw new AppError('Product title is required.', 400)
  if (!draftSlug) throw new AppError('Product slug is required.', 400)
  if (!categoryId || !mongoose.isValidObjectId(categoryId)) throw new AppError('Valid category is required.', 400)
  if (!shortDescription) throw new AppError('Short description is required.', 400)
  if (!description) throw new AppError('Full description is required.', 400)
  if (software.length === 0) throw new AppError('Add at least one software option.', 400)
  if (fileFormats.length === 0) throw new AppError('Add at least one file format.', 400)
  if (packageContents.length === 0) throw new AppError('Add at least one package content item.', 400)
  if (previewImages.length === 0) throw new AppError('At least one preview image is required.', 400)
  if (payload.sku && payload.sku !== existing.sku && (await productSkuExists(payload.sku, productId))) throw new AppError('A product with this SKU already exists.', 409)
  if (draftSlug !== existing.slug && (await productSlugExists(draftSlug, productId))) throw new AppError('A product with this slug already exists.', 409)

  const category = await CadCategory.findById(categoryId).lean()
  if (!category || !category.isActive) throw new AppError('Selected category is not active.', 400)

  const finalSalePrice = isFree ? 0 : (salePriceInPaise ?? 0)
  if (isFree && finalSalePrice !== 0) throw new AppError('Free products must have a sale price of 0 paise.', 400)
  if (!isFree && (!Number.isInteger(finalSalePrice) || finalSalePrice <= 0)) throw new AppError('Paid products require a positive integer sale price in paise.', 400)
  if (Number.isInteger(originalPriceInPaise) && originalPriceInPaise < finalSalePrice) throw new AppError('Original price cannot be lower than the sale price.', 400)

  const updates = {
    title,
    slug: draftSlug,
    sku: payload.sku !== undefined ? (payload.sku ? String(payload.sku).trim() : null) : existing.sku,
    categoryId,
    shortDescription,
    description,
    software,
    fileFormats,
    highlights: payload.highlights !== undefined ? normalizeArray(payload.highlights) : existing.highlights,
    packageContents,
    compatibilityNotes: payload.compatibilityNotes !== undefined ? normalizeString(payload.compatibilityNotes, existing.compatibilityNotes || '') : existing.compatibilityNotes,
    originalPriceInPaise: originalPriceInPaise === null ? null : originalPriceInPaise,
    salePriceInPaise: finalSalePrice,
    currency: 'INR',
    isFree,
    previewImages,
    previewVideoUrl: payload.previewVideoUrl !== undefined ? (safeUrl(payload.previewVideoUrl) || null) : existing.previewVideoUrl,
    licenseType,
    featured: payload.featured !== undefined ? Boolean(payload.featured) : existing.featured,
    status: payload.status !== undefined && ['draft', 'published', 'archived'].includes(payload.status) ? payload.status : existing.status,
    seoTitle: payload.seoTitle !== undefined ? (payload.seoTitle === null ? null : normalizeString(payload.seoTitle, '')) : existing.seoTitle,
    seoDescription: payload.seoDescription !== undefined ? (payload.seoDescription === null ? null : normalizeString(payload.seoDescription, '')) : existing.seoDescription,
    updatedBy: userId,
  }

  const product = await updateCadProductRecord(productId, updates)
  return product
}

export const publishCadProduct = async ({ productId, userId }) => {
  if (!mongoose.isValidObjectId(productId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadProductById(productId)
  if (!existing) return null

  const validation = validateProductPayload({
    title: existing.title,
    slug: existing.slug,
    categoryId: existing.categoryId,
    shortDescription: existing.shortDescription,
    description: existing.description,
    software: existing.software,
    fileFormats: existing.fileFormats,
    packageContents: existing.packageContents,
    originalPriceInPaise: existing.originalPriceInPaise,
    salePriceInPaise: existing.salePriceInPaise,
    isFree: existing.isFree,
    licenseType: existing.licenseType,
    previewImages: existing.previewImages,
    status: 'published'
  })

  if (validation.length > 0) {
    const errors = validation.reduce((accumulator, item) => {
      accumulator[item.field] = item.message
      return accumulator
    }, {})
    throw new AppError('Product is incomplete and cannot be published.', 400)
  }

  return publishCadProductRecord(productId, userId)
}

export const unpublishCadProduct = async ({ productId, userId }) => {
  if (!mongoose.isValidObjectId(productId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadProductById(productId)
  if (!existing) return null

  return unpublishCadProductRecord(productId, userId)
}

export const archiveCadProduct = async ({ productId, userId }) => {
  if (!mongoose.isValidObjectId(productId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadProductById(productId)
  if (!existing) return null

  return archiveCadProductRecord(productId, userId)
}

export const getAvailableCadFormats = () => CAD_PRODUCT_FORMATS

export const getFormatsAsLabels = (formats = []) => (Array.isArray(formats) ? formats.map((format) => format.toUpperCase()) : [])
