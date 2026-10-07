import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listPublicCadCategories, listPublicCadProducts, getPublicCadProductBySlug } from '../controllers/cadProductController.js'
import { listAdminCadCategories, createAdminCadCategory, updateAdminCadCategory, deleteAdminCadCategory, listAdminCadProducts, createAdminCadProduct, getAdminCadProduct, updateAdminCadProduct, publishAdminCadProduct, unpublishAdminCadProduct, archiveAdminCadProduct } from '../controllers/adminCadController.js'
import { uploadCadSecureProductFile, deleteCadSecureProductFile } from '../controllers/cadSecureFileController.js'
import { uploadCadPreviewImage } from '../controllers/cadPreviewImageController.js'
import {
  listPublicCadServices,
  getPublicCadServiceBySlug,
  listAdminCadServices,
  createAdminCadService,
  getAdminCadServiceDetails,
  updateAdminCadService,
  updateAdminCadServiceStatus,
  createStudentCadServiceEnquiry,
  listStudentCadServiceEnquiries,
  getStudentCadServiceEnquiry,
  addStudentCadServiceMessage,
  acceptStudentCadServiceQuotation,
  declineStudentCadServiceQuotation,
  cancelStudentCadServiceEnquiry,
  listAdminCadServiceEnquiries,
  getAdminCadServiceEnquiry,
  updateAdminCadServiceEnquiryStatus,
  assignAdminCadServiceEnquiry,
  addAdminCadServiceMessage,
  createAdminCadServiceQuotation,
  sendAdminCadServiceQuotation
} from '../controllers/cadServiceController.js'

const router = express.Router()
const adminWriteAttempts = new Map()
const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`
  const now = Date.now()
  const recent = (adminWriteAttempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 30) return res.status(429).json({ success: false, message: 'Too many CAD admin requests. Please try again later.' })
  recent.push(now)
  adminWriteAttempts.set(key, recent)
  next()
}

router.get('/cad/categories', listPublicCadCategories)
router.get('/cad-categories', listPublicCadCategories)
router.get('/cad/products', listPublicCadProducts)
router.get('/cad-products', listPublicCadProducts)
router.get('/cad/products/:slug', getPublicCadProductBySlug)
router.get('/cad-products/:slug', getPublicCadProductBySlug)
router.get('/cad-services', listPublicCadServices)
router.get('/cad-services/:slug', getPublicCadServiceBySlug)

router.get('/admin/cad-categories', requireAuthentication, allowRoles('admin'), listAdminCadCategories)
router.post('/admin/cad-categories', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadCategory)
router.patch('/admin/cad-categories/:categoryId', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadCategory)
router.delete('/admin/cad-categories/:categoryId', requireAuthentication, allowRoles('admin'), rateLimit, deleteAdminCadCategory)

router.get('/admin/cad-products', requireAuthentication, allowRoles('admin'), listAdminCadProducts)
router.post('/admin/cad-preview-images', requireAuthentication, allowRoles('admin'), rateLimit, uploadCadPreviewImage)
router.post('/admin/cad-products', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadProduct)
router.get('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), getAdminCadProduct)
router.patch('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadProduct)
router.post('/admin/cad-products/:productId/publish', requireAuthentication, allowRoles('admin'), rateLimit, publishAdminCadProduct)
router.post('/admin/cad-products/:productId/unpublish', requireAuthentication, allowRoles('admin'), rateLimit, unpublishAdminCadProduct)
router.delete('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), rateLimit, archiveAdminCadProduct)
router.post('/admin/cad-products/:productId/secure-file', requireAuthentication, allowRoles('admin'), rateLimit, uploadCadSecureProductFile)
router.delete('/admin/cad-products/:productId/secure-file', requireAuthentication, allowRoles('admin'), rateLimit, deleteCadSecureProductFile)

router.get('/admin/cad-services', requireAuthentication, allowRoles('admin'), listAdminCadServices)
router.post('/admin/cad-services', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadService)
router.get('/admin/cad-services/:serviceId', requireAuthentication, allowRoles('admin'), getAdminCadServiceDetails)
router.patch('/admin/cad-services/:serviceId', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadService)
router.post('/admin/cad-services/:serviceId/status', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadServiceStatus)

router.get('/admin/service-requests', requireAuthentication, allowRoles('admin'), listAdminCadServiceEnquiries)
router.get('/admin/service-requests/:enquiryId', requireAuthentication, allowRoles('admin'), getAdminCadServiceEnquiry)
router.patch('/admin/service-requests/:enquiryId/status', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadServiceEnquiryStatus)
router.patch('/admin/service-requests/:enquiryId/assign', requireAuthentication, allowRoles('admin'), rateLimit, assignAdminCadServiceEnquiry)
router.post('/admin/service-requests/:enquiryId/messages', requireAuthentication, allowRoles('admin'), rateLimit, addAdminCadServiceMessage)
router.post('/admin/service-requests/:enquiryId/quotations', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadServiceQuotation)
router.post('/admin/service-requests/:enquiryId/quotations/:quotationId/send', requireAuthentication, allowRoles('admin'), rateLimit, sendAdminCadServiceQuotation)

router.get('/student/service-requests', requireAuthentication, allowRoles('student'), listStudentCadServiceEnquiries)
router.post('/student/service-requests', requireAuthentication, allowRoles('student'), createStudentCadServiceEnquiry)
router.get('/student/service-requests/:enquiryId', requireAuthentication, allowRoles('student'), getStudentCadServiceEnquiry)
router.post('/student/service-requests/:enquiryId/messages', requireAuthentication, allowRoles('student'), addStudentCadServiceMessage)
router.post('/student/service-requests/:enquiryId/accept-quotation', requireAuthentication, allowRoles('student'), acceptStudentCadServiceQuotation)
router.post('/student/service-requests/:enquiryId/decline-quotation', requireAuthentication, allowRoles('student'), declineStudentCadServiceQuotation)
router.post('/student/service-requests/:enquiryId/cancel', requireAuthentication, allowRoles('student'), cancelStudentCadServiceEnquiry)

export default router
