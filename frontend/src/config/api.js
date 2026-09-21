// const defaultDevApiBaseUrl = 'http://localhost:5000'
// const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? defaultDevApiBaseUrl : '')

// export const apiBaseUrl = rawApiBaseUrl?.trim().replace(/\/+$/, '') || ''

// if (!apiBaseUrl && import.meta.env.DEV) {
//   console.error('VITE_API_BASE_URL is required to connect the frontend to the API. Falling back to http://localhost:5000 in development.')
// }

// export const isApiConfigured = Boolean(apiBaseUrl)

// export default apiBaseUrl
const defaultDevApiBaseUrl = 'http://localhost:5000'
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? defaultDevApiBaseUrl : '')

export const apiBaseUrl = rawApiBaseUrl?.trim().replace(/\/+$/, '') || ''

if (!apiBaseUrl && import.meta.env.DEV) {
  console.error('VITE_API_BASE_URL is required to connect the frontend to the API. Falling back to http://localhost:5000 in development.')
}

export const isApiConfigured = Boolean(apiBaseUrl)

export default apiBaseUrl