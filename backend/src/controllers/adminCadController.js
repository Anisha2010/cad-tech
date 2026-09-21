import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as cadCategoryService from '../services/cadCategoryService.js'
import * as cadProductService from '../services/cadProductService.js'

export const listAdminCadCategories = asyncHandler(async (req, res) => {
  const categories = await cadCategoryService.getAdminCadCategories()
  return sendSuccess(res, { categories }, 'CAD categories retrieved successfully.')
})

export const createAdminCadCategory = asyncHandler(async (req, res) => {
  const category = await cadCategoryService.createCadCategory({ userId: req.user.id, payload: req.body })
  return sendSuccess(res, { category }, 'CAD category created successfully.', 201)
})

export const updateAdminCadCategory = asyncHandler(async (req, res) => {
  const category = await cadCategoryService.updateCadCategory({ categoryId: req.params.categoryId, userId: req.user.id, payload: req.body })
  if (!category) return sendError(res, 'CAD category not found.', 404)
  return sendSuccess(res, { category }, 'CAD category updated successfully.')
})

export const deleteAdminCadCategory = asyncHandler(async (req, res) => {
  const category = await cadCategoryService.deleteCadCategory({ categoryId: req.params.categoryId, userId: req.user.id })
  if (!category) return sendError(res, 'CAD category not found.', 404)
  return sendSuccess(res, { category }, 'CAD category deactivated successfully.')
})

export const listAdminCadProducts = asyncHandler(async (req, res) => {
  const filters = {
    search: typeof req.query.search === 'string' ? req.query.search : '',
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    category: typeof req.query.category === 'string' ? req.query.category : '',
    featured: req.query.featured === 'true' || req.query.featured === 'false' ? req.query.featured : 'all',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20)
  }

  if (filters.limit > 50) filters.limit = 50

  const result = await cadProductService.getAdminCadProductList(filters)
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

export const createAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.createCadProduct({ userId: req.user.id, payload: req.body })
  return sendSuccess(res, { product }, 'CAD product created successfully.', 201)
})

export const getAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.getCadProductAdminDetail(req.params.productId)
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product retrieved successfully.')
})

export const updateAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.updateCadProduct({ productId: req.params.productId, userId: req.user.id, payload: req.body })
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product updated successfully.')
})

export const publishAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.publishCadProduct({ productId: req.params.productId, userId: req.user.id })
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product published successfully.')
})

export const unpublishAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.unpublishCadProduct({ productId: req.params.productId, userId: req.user.id })
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product moved back to draft successfully.')
})

export const archiveAdminCadProduct = asyncHandler(async (req, res) => {
  const product = await cadProductService.archiveCadProduct({ productId: req.params.productId, userId: req.user.id })
  if (!product) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product }, 'CAD product archived successfully.')
})

export default {
  listAdminCadCategories,
  createAdminCadCategory,
  updateAdminCadCategory,
  deleteAdminCadCategory,
  listAdminCadProducts,
  createAdminCadProduct,
  getAdminCadProduct,
  updateAdminCadProduct,
  publishAdminCadProduct,
  unpublishAdminCadProduct,
  archiveAdminCadProduct
}
