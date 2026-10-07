import axios from 'axios'
import apiBaseUrl from '../config/api.js'

async function request(method, path, payload = null, params = {}) {
  const response = await axios({
    method,
    url: `${apiBaseUrl}${path}`,
    data: payload,
    params,
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data ?? response.data
}

export const fetchAdminCadCategories = () => request('get', '/admin/cad-categories')
export const createAdminCadCategory = (payload) => request('post', '/admin/cad-categories', payload)
export const updateAdminCadCategory = (categoryId, payload) => request('patch', `/admin/cad-categories/${categoryId}`, payload)
export const deleteAdminCadCategory = (categoryId) => request('delete', `/admin/cad-categories/${categoryId}`)

export const fetchAdminCadProducts = ({ search = '', status = 'all', category = '', featured = 'all', page = 1, limit = 20 } = {}) => request('get', '/admin/cad-products', null, { search, status, category, featured, page, limit })
export const fetchAdminCadProductById = (productId) => request('get', `/admin/cad-products/${productId}`)
export const createAdminCadProduct = (payload) => request('post', '/admin/cad-products', payload)
export const updateAdminCadProduct = (productId, payload) => request('patch', `/admin/cad-products/${productId}`, payload)
export const publishAdminCadProduct = (productId) => request('post', `/admin/cad-products/${productId}/publish`)
export const unpublishAdminCadProduct = (productId) => request('post', `/admin/cad-products/${productId}/unpublish`)
export const archiveAdminCadProduct = (productId) => request('delete', `/admin/cad-products/${productId}`)
export const uploadCadSecureFile = (productId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axios({
    method: 'post',
    url: `${apiBaseUrl}/admin/cad-products/${productId}/secure-file`,
    data: formData,
    withCredentials: true,
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((response) => response.data?.data || response.data)
}

export const deleteCadSecureFile = (productId) => request('delete', `/admin/cad-products/${productId}/secure-file`)
export const uploadCadPreviewImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axios({ method: 'post', url: `${apiBaseUrl}/admin/cad-preview-images`, data: formData, withCredentials: true, timeout: 120000, headers: { 'Content-Type': 'multipart/form-data' } })
    .then((response) => response.data?.data || response.data)
}

export const fetchAdminCadServices = ({ search = '', status = 'all', page = 1, limit = 20 } = {}) => request('get', '/admin/cad-services', null, { search, status, page, limit })
export const fetchAdminCadServiceById = (serviceId) => request('get', `/admin/cad-services/${serviceId}`)
export const createAdminCadService = (payload) => request('post', '/admin/cad-services', payload)
export const updateAdminCadService = (serviceId, payload) => request('patch', `/admin/cad-services/${serviceId}`, payload)
export const updateAdminCadServiceStatus = (serviceId, status) => request('post', `/admin/cad-services/${serviceId}/status`, { status })

export const fetchAdminServiceEnquiries = ({ status = 'all', search = '', page = 1, limit = 20 } = {}) => request('get', '/admin/service-requests', null, { status, search, page, limit })
export const fetchAdminServiceEnquiryById = (enquiryId) => request('get', `/admin/service-requests/${enquiryId}`)
export const updateAdminServiceEnquiryStatus = (enquiryId, status) => request('patch', `/admin/service-requests/${enquiryId}/status`, { status })
export const assignAdminServiceEnquiry = (enquiryId, assigneeId = null) => request('patch', `/admin/service-requests/${enquiryId}/assign`, { assigneeId })
export const createAdminServiceQuotation = (enquiryId, payload) => request('post', `/admin/service-requests/${enquiryId}/quotations`, payload)
export const sendAdminServiceQuotation = (enquiryId, quotationId) => request('post', `/admin/service-requests/${enquiryId}/quotations/${quotationId}/send`)
export const sendAdminServiceMessage = (enquiryId, message) => request('post', `/admin/service-requests/${enquiryId}/messages`, { message })

export default {
  fetchAdminCadCategories,
  createAdminCadCategory,
  updateAdminCadCategory,
  deleteAdminCadCategory,
  fetchAdminCadProducts,
  fetchAdminCadProductById,
  createAdminCadProduct,
  updateAdminCadProduct,
  publishAdminCadProduct,
  unpublishAdminCadProduct,
  archiveAdminCadProduct,
  uploadCadSecureFile,
  deleteCadSecureFile,
  uploadCadPreviewImage,
  fetchAdminCadServices,
  fetchAdminCadServiceById,
  createAdminCadService,
  updateAdminCadService,
  updateAdminCadServiceStatus,
  fetchAdminServiceEnquiries,
  fetchAdminServiceEnquiryById,
  updateAdminServiceEnquiryStatus,
  assignAdminServiceEnquiry,
  createAdminServiceQuotation,
  sendAdminServiceQuotation,
  sendAdminServiceMessage
}
