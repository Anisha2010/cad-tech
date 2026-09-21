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

export const fetchAdminCourses = ({ search = '', software = '', status = 'all', page = 1, limit = 12 } = {}) => request('get', '/admin/courses', null, { search, software, status, page, limit })
export const getInstructors = () => request('get', '/admin/instructors')
export const createAdminCourse = (payload) => request('post', '/admin/courses', payload)
export const fetchAdminCourseById = (courseId) => request('get', `/admin/courses/${courseId}`)
export const updateAdminCourse = (courseId, payload) => request('patch', `/admin/courses/${courseId}`, payload)
export const assignInstructor = (courseId, instructorId) => request('patch', `/admin/courses/${courseId}/instructor`, { instructorId })
export const updateAdminCourseStatus = (courseId, status) => request('patch', `/admin/courses/${courseId}/status`, { status })
export const archiveAdminCourse = (courseId) => request('delete', `/admin/courses/${courseId}`)

export default { fetchAdminCourses, getInstructors, createAdminCourse, fetchAdminCourseById, updateAdminCourse, assignInstructor, updateAdminCourseStatus, archiveAdminCourse }
