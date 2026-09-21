import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { listPublicCadCategories, listPublicCadProducts, getPublicCadProductBySlug } from '../controllers/cadProductController.js'
import { listAdminCadCategories, createAdminCadCategory, updateAdminCadCategory, deleteAdminCadCategory, listAdminCadProducts, createAdminCadProduct, getAdminCadProduct, updateAdminCadProduct, publishAdminCadProduct, unpublishAdminCadProduct, archiveAdminCadProduct } from '../controllers/adminCadController.js'

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

router.get('/cad-categories', listPublicCadCategories)
router.get('/cad-products', listPublicCadProducts)
router.get('/cad-products/:slug', getPublicCadProductBySlug)

router.get('/admin/cad-categories', requireAuthentication, allowRoles('admin'), listAdminCadCategories)
router.post('/admin/cad-categories', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadCategory)
router.patch('/admin/cad-categories/:categoryId', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadCategory)
router.delete('/admin/cad-categories/:categoryId', requireAuthentication, allowRoles('admin'), rateLimit, deleteAdminCadCategory)

router.get('/admin/cad-products', requireAuthentication, allowRoles('admin'), listAdminCadProducts)
router.post('/admin/cad-products', requireAuthentication, allowRoles('admin'), rateLimit, createAdminCadProduct)
router.get('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), getAdminCadProduct)
router.patch('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), rateLimit, updateAdminCadProduct)
router.post('/admin/cad-products/:productId/publish', requireAuthentication, allowRoles('admin'), rateLimit, publishAdminCadProduct)
router.post('/admin/cad-products/:productId/unpublish', requireAuthentication, allowRoles('admin'), rateLimit, unpublishAdminCadProduct)
router.delete('/admin/cad-products/:productId', requireAuthentication, allowRoles('admin'), rateLimit, archiveAdminCadProduct)

export default router
