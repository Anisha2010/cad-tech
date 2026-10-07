import express from 'express'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import { createAuthLimiter } from '../config/rateLimit.js'
import * as adminUserController from '../controllers/adminUserController.js'

const router = express.Router()
const adminUserMutationLimiter = createAuthLimiter()

router.use(requireAuthentication, allowRoles('admin'))
router.get('/:role', adminUserController.listAdminUsers)
router.get('/:role/:userId', adminUserController.getAdminUser)
router.patch('/:role/:userId/status', adminUserMutationLimiter, adminUserController.updateAdminUserStatus)
router.delete('/:role/:userId', adminUserMutationLimiter, adminUserController.deleteAdminUser)

export default router
