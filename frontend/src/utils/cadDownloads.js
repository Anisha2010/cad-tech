export const normalizeCadDownloadsResponse = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response
  if (!Array.isArray(payload?.entitlements)) {
    throw new Error('The server returned an unexpected response while loading CAD downloads.')
  }
  return payload
}

export const normalizeCadDownloadResponse = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response
  if (typeof payload?.downloadUrl !== 'string' || !payload.downloadUrl) {
    throw new Error('The server did not return a secure CAD download link.')
  }
  return payload
}

export const normalizeCadProductAccessResponse = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response
  if (typeof payload?.hasAccess !== 'boolean') {
    throw new Error('The server returned an unexpected response while checking CAD ownership.')
  }
  return payload
}

export const getCadPurchasePresentation = ({
  isAuthLoading,
  isAuthenticated,
  role,
  ownershipStatus,
  purchaseAvailable
}) => {
  if (isAuthLoading || (isAuthenticated && role === 'student' && ['idle', 'checking'].includes(ownershipStatus))) {
    return 'checking'
  }
  if (isAuthenticated && role === 'student') {
    if (ownershipStatus === 'owned') return 'owned'
    if (ownershipStatus === 'error') return 'error'
    return purchaseAvailable ? 'purchase' : 'unavailable'
  }
  if (isAuthenticated && role !== 'student') return 'student-required'
  return purchaseAvailable ? 'purchase' : 'unavailable'
}
