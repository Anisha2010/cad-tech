const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL

export const apiBaseUrl = rawApiBaseUrl?.trim().replace(/\/+$/, '') || ''

if (!apiBaseUrl && import.meta.env.DEV) {
  console.error('VITE_API_BASE_URL is required to connect the frontend to the API.')
}

export const isApiConfigured = Boolean(apiBaseUrl)

export default apiBaseUrl