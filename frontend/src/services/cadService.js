import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const normalizeCategory = (category = {}) => ({
  id: category.id || category._id || null,
  name: typeof category.name === 'string' ? category.name.trim() : '',
  slug: typeof category.slug === 'string' ? category.slug.trim() : '',
  description: typeof category.description === 'string' ? category.description.trim() : '',
  imageUrl: typeof category.imageUrl === 'string' && category.imageUrl.trim() ? category.imageUrl.trim() : null,
  iconName: typeof category.iconName === 'string' && category.iconName.trim()
    ? category.iconName.trim()
    : (typeof category.icon === 'string' && category.icon.trim() ? category.icon.trim() : null),
  displayOrder: Number.isInteger(Number(category.displayOrder))
    ? Number(category.displayOrder)
    : (Number.isInteger(Number(category.sortOrder)) ? Number(category.sortOrder) : 0)
})

const normalizeProduct = (product = {}) => {
  const software = Array.isArray(product.software)
    ? product.software.map((entry) => String(entry).trim()).filter(Boolean)
    : (typeof product.software === 'string' && product.software.trim() ? [product.software.trim()] : [])

  const fileFormats = Array.isArray(product.fileFormats)
    ? product.fileFormats.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean)
    : (typeof product.fileFormats === 'string' && product.fileFormats.trim() ? [product.fileFormats.trim().toUpperCase()] : [])

  const priceInPaise = Number.isInteger(Number(product.priceInPaise))
    ? Number(product.priceInPaise)
    : (Number.isInteger(Number(product.salePriceInPaise)) ? Number(product.salePriceInPaise) : 0)

  const purchaseAvailable = !Boolean(product.isFree) && Number.isInteger(Number(priceInPaise)) && Number(priceInPaise) > 0

  const thumbnailUrl = typeof product.thumbnailUrl === 'string' && product.thumbnailUrl.trim()
    ? product.thumbnailUrl.trim()
    : (Array.isArray(product.galleryImages) && product.galleryImages.length > 0 ? String(product.galleryImages[0]).trim() : null)

  return {
    id: product.id || product._id || null,
    title: typeof product.title === 'string' ? product.title.trim() : '',
    slug: typeof product.slug === 'string' ? product.slug.trim() : '',
    shortDescription: typeof product.shortDescription === 'string' ? product.shortDescription.trim() : '',
    description: typeof product.description === 'string' ? product.description.trim() : '',
    category: product.category && typeof product.category === 'object' ? {
      id: product.category.id || product.category._id || null,
      name: typeof product.category.name === 'string' ? product.category.name.trim() : '',
      slug: typeof product.category.slug === 'string' ? product.category.slug.trim() : ''
    } : null,
    software,
    fileFormats,
    compatibility: Array.isArray(product.compatibility) ? product.compatibility.map((entry) => String(entry).trim()).filter(Boolean) : [],
    version: typeof product.version === 'string' && product.version.trim() ? product.version.trim() : null,
    thumbnailUrl,
    galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages.map((entry) => String(entry).trim()).filter(Boolean) : [],
    previewFileUrl: typeof product.previewFileUrl === 'string' && product.previewFileUrl.trim() ? product.previewFileUrl.trim() : null,
    includedFiles: Array.isArray(product.includedFiles) ? product.includedFiles.map((entry) => String(entry).trim()).filter(Boolean) : [],
    requirements: Array.isArray(product.requirements) ? product.requirements.map((entry) => String(entry).trim()).filter(Boolean) : [],
    isFree: Boolean(product.isFree),
    priceInPaise,
    currency: typeof product.currency === 'string' ? product.currency.toUpperCase() : 'INR',
    featured: Boolean(product.featured),
    purchaseAvailable,
    meta: product.meta || null
  }
}

export const getCadCategories = async () => {
  const response = await axios.get(`${apiBaseUrl}/cad/categories`, {
    withCredentials: true,
    timeout: 15000
  })

  const categories = Array.isArray(response.data?.data?.categories) ? response.data.data.categories : []
  return categories.map(normalizeCategory).filter((category) => category && category.name && category.slug)
}

export const getCadProducts = async (params = {}) => {
  const safeParams = {}
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    safeParams[key] = value
  })

  const response = await axios.get(`${apiBaseUrl}/cad/products`, {
    params: safeParams,
    withCredentials: true,
    timeout: 15000
  })

  const data = response.data?.data || {}
  const products = Array.isArray(data.products) ? data.products.map(normalizeProduct) : []

  return {
    products,
    pagination: data.pagination || {
      page: 1,
      limit: 12,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    },
    filters: data.filters || { software: [], formats: [] }
  }
}

export const getCadProductBySlug = async (slug) => {
  const response = await axios.get(`${apiBaseUrl}/cad/products/${encodeURIComponent(String(slug || ''))}`, {
    withCredentials: true,
    timeout: 15000
  })
  return normalizeProduct(response.data?.data?.product || null)
}

const request = (method, path, data) => axios({ method, url: `${apiBaseUrl}${path}`, data, withCredentials: true, timeout: 20000 })

export const getCadServiceCatalog = async (params = {}) => {
  const safeParams = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    safeParams[key] = value
  })

  const response = await axios.get(`${apiBaseUrl}/cad-services`, { params: safeParams, withCredentials: true, timeout: 15000 })
  const data = response.data?.data || {}
  return {
    services: Array.isArray(data.services) ? data.services : [],
    pagination: data.pagination || { page: 1, limit: 12, totalItems: 0, totalPages: 0 }
  }
}

export const getCadServiceBySlug = async (slug) => {
  const response = await axios.get(`${apiBaseUrl}/cad-services/${encodeURIComponent(String(slug || ''))}`, {
    withCredentials: true,
    timeout: 15000
  })
  return response.data?.data?.service || null
}

export const createServiceEnquiry = async (payload) => {
  const response = await axios.post(`${apiBaseUrl}/student/service-requests`, payload, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data
}

export const fetchStudentServiceRequests = async ({ status = 'all', page = 1, limit = 20 } = {}) => {
  const response = await axios.get(`${apiBaseUrl}/student/service-requests`, {
    params: { status, page, limit },
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || { enquiries: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } }
}

export const fetchStudentServiceRequestById = async (enquiryId) => {
  const response = await axios.get(`${apiBaseUrl}/student/service-requests/${encodeURIComponent(String(enquiryId || ''))}`, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || null
}

export const sendStudentServiceMessage = async (enquiryId, message) => {
  const response = await axios.post(`${apiBaseUrl}/student/service-requests/${encodeURIComponent(String(enquiryId || ''))}/messages`, { message }, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data
}

export const acceptStudentServiceQuotation = async (enquiryId) => {
  const response = await axios.post(`${apiBaseUrl}/student/service-requests/${encodeURIComponent(String(enquiryId || ''))}/accept-quotation`, {}, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data
}

export const declineStudentServiceQuotation = async (enquiryId, reason = '') => {
  const response = await axios.post(`${apiBaseUrl}/student/service-requests/${encodeURIComponent(String(enquiryId || ''))}/decline-quotation`, { reason }, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data
}

export const cancelStudentServiceRequest = async (enquiryId) => {
  const response = await axios.post(`${apiBaseUrl}/student/service-requests/${encodeURIComponent(String(enquiryId || ''))}/cancel`, {}, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data
}

export const createCadPaymentOrder = (productSlug) => request('post', '/cad-payments/orders', { productSlug })
export const verifyCadPayment = (details) => request('post', '/cad-payments/verify', details)

export default {
  getCadCategories,
  getCadProducts,
  getCadProductBySlug,
  getCadServiceCatalog,
  getCadServiceBySlug,
  createServiceEnquiry,
  fetchStudentServiceRequests,
  fetchStudentServiceRequestById,
  sendStudentServiceMessage,
  acceptStudentServiceQuotation,
  declineStudentServiceQuotation,
  cancelStudentServiceRequest,
  createCadPaymentOrder,
  verifyCadPayment
}
