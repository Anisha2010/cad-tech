import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const upload = async (path, file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axios.post(`${apiBaseUrl}${path}`, formData, {
    withCredentials: true,
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data?.data ?? response.data
}

export const uploadAdminCourseMedia = (kind, file) => upload(`/admin/courses/media/${kind}`, file)
export const uploadInstructorCourseMedia = (courseId, kind, file) => upload(`/instructor/courses/${courseId}/media/${kind}`, file)

export default { uploadAdminCourseMedia, uploadInstructorCourseMedia }