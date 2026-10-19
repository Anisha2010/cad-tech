const CAD_SECURE_UPLOAD_ERROR_CODES = {
  STORAGE_NOT_CONFIGURED: 'CAD_STORAGE_NOT_CONFIGURED',
  PROVIDER_UPLOAD_FAILED: 'CAD_PROVIDER_UPLOAD_FAILED',
  PROVIDER_REJECTED: 'CAD_PROVIDER_REJECTED'
}

export const getCadStorageStatus = ({ secureFile, errorCode } = {}) => {
  if (secureFile) return 'Storage Ready'
  if (errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.STORAGE_NOT_CONFIGURED) return 'Storage Unavailable'
  if (
    errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_UPLOAD_FAILED ||
    errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_REJECTED
  ) return 'Upload Failed'
  return 'No secure file uploaded'
}

export const getCadSecureUploadErrorMessage = (errorCode) => {
  if (errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.STORAGE_NOT_CONFIGURED) {
    return 'Secure CAD uploads are temporarily unavailable.'
  }
  if (errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_UPLOAD_FAILED) {
    return 'Secure CAD upload failed. Please try again later.'
  }
  if (errorCode === CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_REJECTED) {
    return 'Secure CAD provider rejected the upload.'
  }
  return null
}
