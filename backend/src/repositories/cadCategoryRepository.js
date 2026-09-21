import mongoose from 'mongoose'
import { CadCategory, serializeCadCategory } from '../models/CadCategory.js'
import { CadProduct } from '../models/CadProduct.js'

const escapeRegex = (value) => String(value).trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const listPublicCadCategories = async () => {
  const categories = await CadCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()
  return categories.map(serializeCadCategory)
}

export const listAdminCadCategories = async () => {
  const categories = await CadCategory.find({}).sort({ isActive: -1, sortOrder: 1, name: 1 }).lean()
  return categories.map(serializeCadCategory)
}

export const findCadCategoryById = async (categoryId) => {
  if (!mongoose.isValidObjectId(categoryId)) return null
  const category = await CadCategory.findById(categoryId).lean()
  return category ? serializeCadCategory(category) : null
}

export const findCadCategoryBySlug = async (slug, { includeInactive = false } = {}) => {
  if (!slug || typeof slug !== 'string') return null
  const normalized = slug.trim().toLowerCase()
  const filter = { slug: normalized }
  if (!includeInactive) filter.isActive = true
  const category = await CadCategory.findOne(filter).lean()
  return category ? serializeCadCategory(category) : null
}

export const createCadCategoryRecord = async (payload) => {
  const category = await CadCategory.create(payload)
  return serializeCadCategory(category)
}

export const updateCadCategoryRecord = async (categoryId, updates) => {
  const category = await CadCategory.findByIdAndUpdate(categoryId, { $set: updates }, { new: true, runValidators: true }).lean()
  return category ? serializeCadCategory(category) : null
}

export const deactivateCadCategoryRecord = async (categoryId) => {
  const category = await CadCategory.findByIdAndUpdate(categoryId, { $set: { isActive: false } }, { new: true, runValidators: true }).lean()
  return category ? serializeCadCategory(category) : null
}

export const categorySlugExists = async (slug, excludeId = null) => {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return false
  const category = await CadCategory.findOne({ slug: normalized, _id: { $ne: excludeId || undefined } }).lean()
  return Boolean(category)
}

export const productsReferenceCategory = async (categoryId) => {
  if (!mongoose.isValidObjectId(categoryId)) return false
  return Boolean(await CadProduct.exists({ categoryId }))
}

export const searchCadCategories = async (query = '') => {
  const safeQuery = escapeRegex(query)
  const filter = { isActive: true }
  if (safeQuery) {
    filter.$or = [
      { name: { $regex: safeQuery, $options: 'i' } },
      { description: { $regex: safeQuery, $options: 'i' } },
      { slug: { $regex: safeQuery, $options: 'i' } }
    ]
  }
  const categories = await CadCategory.find(filter).sort({ sortOrder: 1, name: 1 }).lean()
  return categories.map(serializeCadCategory)
}
