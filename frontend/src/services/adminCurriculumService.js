import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

async function request(method, path, payload = null) {
  const response = await axios({
    method,
    url: `${getBaseUrl()}${path}`,
    data: payload,
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data ?? response.data
}

export const fetchAdminCurriculum = (courseId) => request('get', `/admin/courses/${courseId}/curriculum`)
export const createCurriculumSection = (courseId, payload) => request('post', `/admin/courses/${courseId}/curriculum/sections`, payload)
export const updateCurriculumSection = (courseId, sectionId, payload) => request('patch', `/admin/courses/${courseId}/curriculum/sections/${sectionId}`, payload)
export const archiveCurriculumSection = (courseId, sectionId) => request('delete', `/admin/courses/${courseId}/curriculum/sections/${sectionId}`)
export const reorderCurriculumSections = (courseId, orderedSectionIds) => request('patch', `/admin/courses/${courseId}/curriculum/sections/reorder`, { orderedSectionIds })
export const createCurriculumLesson = (courseId, sectionId, payload) => request('post', `/admin/courses/${courseId}/curriculum/sections/${sectionId}/lessons`, payload)
export const updateCurriculumLesson = (courseId, sectionId, lessonId, payload) => request('patch', `/admin/courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`, payload)
export const archiveCurriculumLesson = (courseId, sectionId, lessonId) => request('delete', `/admin/courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`)
export const reorderCurriculumLessons = (courseId, sectionId, orderedLessonIds) => request('patch', `/admin/courses/${courseId}/curriculum/sections/${sectionId}/lessons/reorder`, { orderedLessonIds })
export const publishCurriculum = (courseId, isPublished) => request('patch', `/admin/courses/${courseId}/curriculum/publish`, { isPublished })

export default {
  fetchAdminCurriculum,
  createCurriculumSection,
  updateCurriculumSection,
  archiveCurriculumSection,
  reorderCurriculumSections,
  createCurriculumLesson,
  updateCurriculumLesson,
  archiveCurriculumLesson,
  reorderCurriculumLessons,
  publishCurriculum
}
