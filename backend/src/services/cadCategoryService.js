import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import {
  categorySlugExists,
  createCadCategoryRecord,
  deactivateCadCategoryRecord,
  findCadCategoryById,
  findCadCategoryBySlug,
  listAdminCadCategories,
  listPublicCadCategories,
  productsReferenceCategory,
  updateCadCategoryRecord
} from '../repositories/cadCategoryRepository.js'

const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

const normalizeSortOrder = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

export const getPublicCadCategories = async () => listPublicCadCategories()

export const getAdminCadCategories = async () => listAdminCadCategories()

export const getCadCategoryById = async (categoryId) => findCadCategoryById(categoryId)

export const createCadCategory = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const name = normalizeString(payload.name)
  if (!name) throw new AppError('Category name is required.', 400)

  const slug = slugify(payload.slug || name)
  if (!slug) throw new AppError('Category slug is required.', 400)
  if (await categorySlugExists(slug)) throw new AppError('A category with this slug already exists.', 409)

  const category = await createCadCategoryRecord({
    name,
    slug,
    description: normalizeString(payload.description, ''),
    imageUrl: payload.imageUrl === null || payload.imageUrl === undefined ? null : normalizeString(payload.imageUrl),
    icon: payload.icon === null || payload.icon === undefined ? null : normalizeString(payload.icon),
    sortOrder: normalizeSortOrder(payload.sortOrder),
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
  })

  return category
}

export const updateCadCategory = async ({ categoryId, userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(categoryId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadCategoryById(categoryId)
  if (!existing) return null

  const name = payload.name !== undefined ? normalizeString(payload.name) : existing.name
  if (!name) throw new AppError('Category name is required.', 400)

  const nextSlug = payload.slug !== undefined ? slugify(payload.slug || name) : existing.slug
  if (!nextSlug) throw new AppError('Category slug is required.', 400)
  if (nextSlug !== existing.slug && await categorySlugExists(nextSlug, categoryId)) throw new AppError('A category with this slug already exists.', 409)

  const updates = {
    name,
    slug: nextSlug,
    description: payload.description !== undefined ? normalizeString(payload.description, '') : existing.description,
    imageUrl: payload.imageUrl !== undefined ? (payload.imageUrl === null ? null : normalizeString(payload.imageUrl)) : existing.imageUrl,
    icon: payload.icon !== undefined ? (payload.icon === null ? null : normalizeString(payload.icon)) : existing.icon,
    sortOrder: payload.sortOrder !== undefined ? normalizeSortOrder(payload.sortOrder) : existing.sortOrder,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : existing.isActive,
  }

  return updateCadCategoryRecord(categoryId, updates)
}

export const deleteCadCategory = async ({ categoryId, userId }) => {
  if (!mongoose.isValidObjectId(categoryId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const existing = await findCadCategoryById(categoryId)
  if (!existing) return null

  const productExists = await productsReferenceCategory(categoryId)
  if (productExists) {
    throw new AppError('This category is in use by CAD products and cannot be permanently deleted. It has been deactivated instead.', 409)
  }

  return deactivateCadCategoryRecord(categoryId)
}

export const getCadCategoryBySlug = async (slug, { includeInactive = false } = {}) => findCadCategoryBySlug(slug, { includeInactive })
