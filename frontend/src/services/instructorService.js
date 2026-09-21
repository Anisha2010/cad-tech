import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

async function request(method, path, payload = null, params = {}) {
  const response = await axios({
    method,
    url: `${getBaseUrl()}${path}`,
    data: payload,
    params,
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data ?? response.data
}

export const fetchInstructorDashboard = () => request('get', '/instructor/dashboard')
export const fetchInstructorCourses = (filters = {}) => request('get', '/instructor/courses', null, filters)
export const fetchInstructorCourse = (courseId) => request('get', `/instructor/courses/${courseId}`)
export const updateInstructorCourse = (courseId, payload) => request('patch', `/instructor/courses/${courseId}`, payload)
export const submitCourseForReview = (courseId) => request('post', `/instructor/courses/${courseId}/submit-review`)
export const fetchInstructorOptions = () => request('get', '/instructor/options')
export const fetchInstructorCurriculum = (courseId) => request('get', `/instructor/courses/${courseId}/curriculum`)
export const createInstructorCurriculumSection = (courseId, payload) => request('post', `/instructor/courses/${courseId}/curriculum/sections`, payload)
export const updateInstructorCurriculumSection = (courseId, sectionId, payload) => request('patch', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}`, payload)
export const archiveInstructorCurriculumSection = (courseId, sectionId) => request('delete', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}`)
export const deleteInstructorCurriculumSection = archiveInstructorCurriculumSection
export const reorderInstructorCurriculumSections = (courseId, orderedSectionIds) => request('patch', `/instructor/courses/${courseId}/curriculum/sections/reorder`, { orderedSectionIds })
export const createInstructorCurriculumLesson = (courseId, sectionId, payload) => request('post', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}/lessons`, payload)
export const updateInstructorCurriculumLesson = (courseId, sectionId, lessonId, payload) => request('patch', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`, payload)
export const archiveInstructorCurriculumLesson = (courseId, sectionId, lessonId) => request('delete', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}/lessons/${lessonId}`)
export const deleteInstructorCurriculumLesson = archiveInstructorCurriculumLesson
export const reorderInstructorCurriculumLessons = (courseId, sectionId, orderedLessonIds) => request('patch', `/instructor/courses/${courseId}/curriculum/sections/${sectionId}/lessons/reorder`, { orderedLessonIds })

export default {
  fetchInstructorDashboard,
  fetchInstructorCourses,
  fetchInstructorCourse,
  updateInstructorCourse,
  submitCourseForReview,
  fetchInstructorOptions,
  fetchInstructorCurriculum,
  createInstructorCurriculumSection,
  updateInstructorCurriculumSection,
  archiveInstructorCurriculumSection,
  deleteInstructorCurriculumSection,
  reorderInstructorCurriculumSections,
  createInstructorCurriculumLesson,
  updateInstructorCurriculumLesson,
  archiveInstructorCurriculumLesson,
  deleteInstructorCurriculumLesson,
  reorderInstructorCurriculumLessons
}
