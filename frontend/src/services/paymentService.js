import axios from 'axios'

const baseUrl = () => import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
const request = (method, path, data) => axios({ method, url: `${baseUrl()}${path}`, data, withCredentials: true, timeout: 15000 })
export const createPaymentOrder = (courseSlug) => request('post', '/payments/orders', { courseSlug })
export const verifyPayment = (details) => request('post', '/payments/verify', details)