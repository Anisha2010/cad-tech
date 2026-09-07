import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { createPaymentOrder, verifyPayment } from '../../services/paymentService.js'
import { fetchMyCourses } from '../../services/studentService.js'
import './CourseCheckoutButton.css'

let checkoutPromise
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!checkoutPromise) checkoutPromise = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Unable to load payment checkout.')); document.body.appendChild(script) })
  return checkoutPromise
}

function CourseCheckoutButton({ course }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const [isEnrolled, setIsEnrolled] = useState(false)
  const unavailable = !Number.isInteger(course.priceInPaise) || course.priceInPaise <= 0 || !course.enrollmentOpen
  useEffect(() => { if (isAuthenticated) fetchMyCourses().then((enrollments) => setIsEnrolled(enrollments.some((enrollment) => enrollment.courseSlug === course.slug))).catch(() => {}) }, [course.slug, isAuthenticated])
  const startCheckout = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location } }); return }
    setState('creating'); setMessage('')
    try {
      const order = (await createPaymentOrder(course.slug)).data?.data
      await loadCheckout()
      setState('verifying')
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: 'CadTech Solution', description: order.courseTitle, order_id: order.providerOrderId, handler: async (response) => { try { await verifyPayment(response); resolve() } catch (error) { reject(error) } }, modal: { ondismiss: () => reject(new Error('dismissed')) } })
        checkout.open()
      })
      setMessage('Payment verified. Course added to My Courses.')
      navigate('/student/my-courses', { replace: true })
    } catch (error) { setMessage(error.message === 'dismissed' ? 'Payment was not completed.' : 'Payment could not be verified. Please contact support if an amount was deducted.') } finally { setState('idle') }
  }
  if (isEnrolled) return <button className="button button-primary checkout-button" type="button" onClick={() => navigate('/student/my-courses')}>Go to My Courses</button>
  if (unavailable) return <p className="checkout-unavailable" role="status">Enrollment currently unavailable.</p>
  return <div className="checkout-wrap"><button className="button button-primary checkout-button" type="button" disabled={state !== 'idle'} onClick={startCheckout}>{state === 'creating' ? 'Preparing Checkout...' : state === 'verifying' ? 'Verifying Payment...' : 'Buy Course'}</button>{message && <p className="checkout-message" role="status" aria-live="polite">{message}</p>}</div>
}
export default CourseCheckoutButton
