import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const request = async (path, params = {}) => {
  const response = await axios.get(`${apiBaseUrl}${path}`, {
    params,
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data || response.data || {}
}

export const getPublicSiteSettings = () => request('/site-settings')
export const getPublicHomepageContent = () => request('/homepage')
export const getPublicAboutContent = () => request('/about')
export const getPublicTestimonials = () => request('/testimonials')
export const getPublicFaqs = () => request('/faqs')
export const getPublicPortfolio = () => request('/portfolio')

export const submitContactInquiry = async (payload) => {
  const response = await axios.post(`${apiBaseUrl}/contact`, payload, {
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data || response.data || {}
}

export const fetchAdminSiteSettings = () => request('/admin/site-settings')
export const fetchAdminCmsSummary = () => request('/admin/cms/summary')
export const getAdminContactEnquiries = () => request('/admin/contact-enquiries')
export const getAdminContactEnquiry = (enquiryId) => request(`/admin/contact-enquiries/${enquiryId}`)

const adminCmsPaths = {
  homepage: '/admin/homepage',
  about: '/admin/about',
  testimonials: '/admin/testimonials',
  faqs: '/admin/faqs',
  portfolio: '/admin/portfolio'
}

const getAdminCmsPath = (section) => {
  const path = adminCmsPaths[section]
  if (!path) throw new Error('Unsupported website content section.')
  return path
}

export const fetchAdminCmsItems = (section) => request(getAdminCmsPath(section))

export const createAdminCmsItem = async (section, payload) => {
  const response = await axios.post(`${apiBaseUrl}${getAdminCmsPath(section)}`, payload, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data || {}
}

export const updateAdminCmsItem = async (section, itemId, payload) => {
  const response = await axios.patch(`${apiBaseUrl}${getAdminCmsPath(section)}/${itemId}`, payload, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data || {}
}

export const deleteAdminCmsItem = async (section, itemId) => {
  const response = await axios.delete(`${apiBaseUrl}${getAdminCmsPath(section)}/${itemId}`, {
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data || response.data || {}
}

export const saveAdminSiteSettings = async (payload) => {
  const response = await axios.post(`${apiBaseUrl}/admin/site-settings`, payload, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data || response.data || {}
}

export const uploadFounderImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axios.post(`${apiBaseUrl}/admin/site-settings/founder-image`, formData, {
    withCredentials: true,
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return response.data?.data || response.data || {}
}

export const updateAdminContactEnquiryStatus = async (enquiryId, status) => {
  const response = await axios.patch(`${apiBaseUrl}/admin/contact-enquiries/${enquiryId}/status`, { status }, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data || response.data || {}
}

export const updateAdminContactEnquiryNotes = async (enquiryId, notes) => {
  const response = await axios.patch(`${apiBaseUrl}/admin/contact-enquiries/${enquiryId}/notes`, { notes }, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data || response.data || {}
}

export default {
  getPublicSiteSettings,
  getPublicHomepageContent,
  getPublicAboutContent,
  getPublicTestimonials,
  getPublicFaqs,
  getPublicPortfolio,
  submitContactInquiry,
  fetchAdminSiteSettings,
  fetchAdminCmsSummary,
  getAdminContactEnquiries,
  getAdminContactEnquiry,
  saveAdminSiteSettings,
  updateAdminContactEnquiryStatus,
  updateAdminContactEnquiryNotes
}
