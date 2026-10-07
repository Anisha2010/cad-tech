import express from 'express'
import { verifyPublicCertificate } from '../controllers/publicCertificateController.js'

const router = express.Router()

router.get('/certificates/verify/:verificationCode', verifyPublicCertificate)

export default router
