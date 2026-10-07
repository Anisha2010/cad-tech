import api from './api.js'

export const getStudentCourseCompletion = (courseId) => api.get(`/student/courses/${courseId}/completion`).then((response) => response.data?.data ?? response.data)
export const requestStudentCertificate = (courseId) => api.post(`/student/courses/${courseId}/certificate`).then((response) => response.data?.data ?? response.data)
export const getStudentCertificates = () => api.get('/student/certificates').then((response) => response.data?.data ?? response.data)
export const getStudentCertificate = (certificateId) => api.get(`/student/certificates/${certificateId}`).then((response) => response.data?.data ?? response.data)
export const downloadStudentCertificate = (certificateId) => api.get(`/student/certificates/${certificateId}/download`, { responseType: 'blob' }).then((response) => response)
export const verifyPublicCertificate = (verificationCode) => api.get(`/certificates/verify/${verificationCode}`).then((response) => response.data?.data ?? response.data)
export const fetchAdminCertificates = (params = {}) => api.get('/admin/certificates', { params }).then((response) => response.data?.data ?? response.data)
export const revokeAdminCertificate = (certificateId, reason) => api.patch(`/admin/certificates/${certificateId}/revoke`, { reason }).then((response) => response.data?.data ?? response.data)
export const reissueAdminCertificate = (certificateId) => api.post(`/admin/certificates/${certificateId}/reissue`).then((response) => response.data?.data ?? response.data)

export default {
  getStudentCourseCompletion,
  requestStudentCertificate,
  getStudentCertificates,
  getStudentCertificate,
  downloadStudentCertificate,
  verifyPublicCertificate,
  fetchAdminCertificates,
  revokeAdminCertificate,
  reissueAdminCertificate
}
