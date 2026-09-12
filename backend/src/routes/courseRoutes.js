import express from 'express'
import { listPublicCourses, getPublicCourseBySlug } from '../controllers/courseController.js'

const router = express.Router()

router.get('/', listPublicCourses)
router.get('/:courseSlug', getPublicCourseBySlug)

export default router
