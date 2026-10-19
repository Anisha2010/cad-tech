import axios from 'axios'
import apiBaseUrl from '../config/api.js'
import { requireCourseSlug } from '../utils/courseSlug.js'

const getBaseUrl = () => apiBaseUrl

export async function getStudentLearning(courseSlug) {
  const slug = requireCourseSlug(courseSlug)
  const response = await axios.get(`${getBaseUrl()}/student/learning/${slug}`, {
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data ?? { course: null, enrollment: null, curriculum: { sections: [] } }
}

export async function updateStudentLessonProgress(courseSlug, lessonId, payload = {}) {
  const slug = requireCourseSlug(courseSlug)
  const response = await axios.put(`${getBaseUrl()}/student/learning/${slug}/lessons/${lessonId}/progress`, payload, {
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data ?? null
}

export async function updateStudentLessonPosition(courseSlug, lessonId, payload = {}) {
  const slug = requireCourseSlug(courseSlug)
  const response = await axios.put(`${getBaseUrl()}/student/learning/${slug}/lessons/${lessonId}/position`, payload, {
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data ?? null
}

export default { getStudentLearning, updateStudentLessonProgress, updateStudentLessonPosition }
