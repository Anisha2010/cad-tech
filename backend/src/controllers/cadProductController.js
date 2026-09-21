import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as cadCategoryService from '../services/cadCategoryService.js'
import * as cadProductService from '../services/cadProductService.js'

export const listPublicCadCategories = asyncHandler(async (req, res) => {
  const categories = await cadCategoryService.getPublicCadCategories()
  return sendSuccess(res, { categories }, 'CAD categories retrieved successfully.')
})

export const listPublicCadProducts = asyncHandler(async (req, res) => {
  const filters = {
    search: typeof req.query.search === 'string' ? req.query.search : '',
    category: typeof req.query.category === 'string' ? req.query.category : '',
    software: typeof req.query.software === 'string' ? req.query.software : '',
    format: typeof req.query.format === 'string' ? req.query.format : '',
    pricing: typeof req.query.pricing === 'string' ? req.query.pricing : 'all',
    featured: req.query.featured === 'true',
    sort: typeof req.query.sort === 'string' ? req.query.sort : 'newest',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 12)
  }

  if (filters.limit > 24) filters.limit = 24

  const result = await cadProductService.getPublicCadProductList(filters)
  return sendSuccess(res, {
    products: result.products,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'CAD products retrieved successfully.')
})

export const getPublicCadProductBySlug = asyncHandler(async (req, res) => {
  const product = await cadProductService.getPublicCadProductDetail(req.params.slug)
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product retrieved successfully.')
})

export default {
  listPublicCadCategories,
  listPublicCadProducts,
  getPublicCadProductBySlug
}
