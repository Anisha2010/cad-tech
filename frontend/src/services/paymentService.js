import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const baseUrl = () => apiBaseUrl
const request = (method, path, data) => axios({ method, url: `${baseUrl()}${path}`, data, withCredentials: true, timeout: 15000 })
export const createPaymentOrder = (courseSlug) => request('post', '/payments/orders', { courseSlug })
export const verifyPayment = (details) => request('post', '/payments/verify', details)