import mongoose from 'mongoose'
import { CadProduct, serializeCadProduct } from '../models/CadProduct.js'
import { CadCategory } from '../models/CadCategory.js'

const escapeRegex = (value) => String(value).trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const supportedSorts = {
  newest: { createdAt: -1 },
  featured: { featured: -1, createdAt: -1 },
  price_asc: { salePriceInPaise: 1, createdAt: -1 },
  price_desc: { salePriceInPaise: -1, createdAt: -1 }
}

export const getPublishedCadProducts = async ({ search = '', category = '', software = '', format = '', pricing = 'all', featured = false, sort = 'newest', page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  const maxLimit = Math.min(safeLimit, 50)
  const filter = { status: 'published' }

  const activeCategoryIds = await CadCategory.find({ isActive: true }).select('_id').lean()
  if (!activeCategoryIds.length) {
    return { products: [], totalItems: 0, page: safePage, limit: maxLimit, totalPages: 0 }
  }
  filter.categoryId = { $in: activeCategoryIds.map((categoryDoc) => categoryDoc._id) }

  if (category) {
    const matchedCategory = await CadCategory.findOne({ slug: String(category).trim().toLowerCase(), isActive: true }).select('_id').lean()
    if (!matchedCategory) {
      return { products: [], totalItems: 0, page: safePage, limit: maxLimit, totalPages: 0 }
    }
    filter.categoryId = matchedCategory._id
  }

  if (software) {
    filter.software = { $in: [String(software).trim()] }
  }

  if (format) {
    filter.fileFormats = { $in: [String(format).trim().toUpperCase()] }
  }

  if (pricing === 'free') filter.isFree = true
  if (pricing === 'paid') filter.isFree = false
  if (featured) filter.featured = true

  if (search) {
    const safeSearch = escapeRegex(search)
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { shortDescription: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
      { software: { $regex: safeSearch, $options: 'i' } },
      { fileFormats: { $regex: safeSearch, $options: 'i' } }
    ]
  }

  const sortField = supportedSorts[sort] || supportedSorts.newest
  const [totalItems, products] = await Promise.all([
    CadProduct.countDocuments(filter),
    CadProduct.find(filter)
      .populate('categoryId', 'name slug isActive')
      .sort(sortField)
      .skip((safePage - 1) * maxLimit)
      .limit(maxLimit)
      .lean()
  ])

  return {
    products: products.map(serializeCadProduct),
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const getCadProductBySlug = async (slug, { includeArchived = false, includeDraft = false } = {}) => {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null
  const filter = { slug: normalized }
  if (!includeArchived && !includeDraft) filter.status = 'published'
  if (includeArchived && !includeDraft) filter.status = { $in: ['published', 'archived'] }
  if (includeDraft && !includeArchived) filter.status = { $in: ['draft', 'published'] }

  const product = await CadProduct.findOne(filter).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}

export const getAdminCadProducts = async ({ search = '', status = 'all', category = '', featured = 'all', page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  const maxLimit = Math.min(safeLimit, 50)
  const filter = {}

  if (status && status !== 'all') filter.status = status
  if (featured === 'true' || featured === true) filter.featured = true
  if (featured === 'false' || featured === false) filter.featured = false

  if (category) {
    const matchedCategory = await CadCategory.findOne({ slug: String(category).trim().toLowerCase() }).select('_id').lean()
    if (matchedCategory) filter.categoryId = matchedCategory._id
  }

  if (search) {
    const safeSearch = escapeRegex(search)
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { slug: { $regex: safeSearch, $options: 'i' } },
      { sku: { $regex: safeSearch, $options: 'i' } },
      { shortDescription: { $regex: safeSearch, $options: 'i' } }
    ]
  }

  const [totalItems, products] = await Promise.all([
    CadProduct.countDocuments(filter),
    CadProduct.find(filter)
      .populate('categoryId', 'name slug isActive')
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * maxLimit)
      .limit(maxLimit)
      .lean()
  ])

  return {
    products: products.map(serializeCadProduct),
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const findCadProductById = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) return null
  const product = await CadProduct.findById(productId).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}

export const createCadProductRecord = async (payload) => {
  const product = await CadProduct.create(payload)
  const populated = await product.populate('categoryId', 'name slug isActive')
  return serializeCadProduct(populated)
}

export const updateCadProductRecord = async (productId, updates) => {
  const product = await CadProduct.findByIdAndUpdate(productId, { $set: updates }, { new: true, runValidators: true }).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}

export const productSlugExists = async (slug, excludeId = null) => {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return false
  const product = await CadProduct.findOne({ slug: normalized, _id: { $ne: excludeId || undefined } }).lean()
  return Boolean(product)
}

export const productSkuExists = async (sku, excludeId = null) => {
  const normalized = String(sku || '').trim()
  if (!normalized) return false
  const product = await CadProduct.findOne({ sku: normalized, _id: { $ne: excludeId || undefined } }).lean()
  return Boolean(product)
}

export const archiveCadProductRecord = async (productId, updatedBy) => {
  const product = await CadProduct.findByIdAndUpdate(productId, {
    $set: {
      status: 'archived',
      archivedAt: new Date(),
      updatedBy,
      publishedAt: null
    }
  }, { new: true, runValidators: true }).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}

export const publishCadProductRecord = async (productId, updatedBy) => {
  const product = await CadProduct.findByIdAndUpdate(productId, {
    $set: {
      status: 'published',
      publishedAt: new Date(),
      archivedAt: null,
      updatedBy
    }
  }, { new: true, runValidators: true }).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}

export const unpublishCadProductRecord = async (productId, updatedBy) => {
  const product = await CadProduct.findByIdAndUpdate(productId, {
    $set: {
      status: 'draft',
      publishedAt: null,
      updatedBy
    }
  }, { new: true, runValidators: true }).populate('categoryId', 'name slug isActive').lean()
  return product ? serializeCadProduct(product) : null
}
