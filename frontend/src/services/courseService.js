import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

export async function fetchPublicCourses({ search = '', software = '', level = '', category = '', page = 1, limit = 12 } = {}) {
  const response = await axios.get(`${getBaseUrl()}/courses`, {
    params: { search, software, level, category, page, limit },
    withCredentials: true,
    timeout: 15000
  })

  return response.data?.data ?? { courses: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } }
}

export async function fetchCourseBySlug(slug) {
  const response = await axios.get(`${getBaseUrl()}/courses/${slug}`, {
    withCredentials: true,
    timeout: 15000
  })
  return response.data?.data ?? { course: null }
}

export default { fetchPublicCourses, fetchCourseBySlug }
