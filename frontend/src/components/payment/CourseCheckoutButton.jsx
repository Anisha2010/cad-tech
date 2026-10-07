import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { createPaymentOrder, getCoursePaymentStatus, verifyPayment } from '../../services/paymentService.js'
import './CourseCheckoutButton.css'

let checkoutPromise
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!checkoutPromise) checkoutPromise = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Unable to load payment checkout.')); document.body.appendChild(script) })
  return checkoutPromise
}

function CourseCheckoutButton({ course, courseSlug = course?.slug }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState('checking_status')
  const [message, setMessage] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [pendingOrderId, setPendingOrderId] = useState('')
  const [confirmedIdentity, setConfirmedIdentity] = useState('')
  const mountedRef = useRef(false)
  const checkoutPendingRef = useRef(false)
  const statusPendingRef = useRef(false)
  const unavailable = !Number.isInteger(course?.priceInPaise) || course.priceInPaise <= 0 || !course.enrollmentOpen || course.status !== 'published'
  const identity = `${user?.id || ''}:${courseSlug}`

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const applyBackendStatus = useCallback((result, fromPending = false) => {
    if (!mountedRef.current) return
    const data = result?.data?.data ?? result?.data ?? result
    setConfirmedIdentity(identity)
    if (data?.status === 'enrolled' && data.enrollment) {
      setEnrollment(data.enrollment)
      setState('paid/enrolled')
      setMessage(fromPending ? 'Payment successful! You are now enrolled in this course.' : '')
      setPendingOrderId('')
      return
    }
    setEnrollment(null)
    if (data?.status === 'pending') {
      setState('verification_pending')
      setMessage('Payment verification pending')
    } else if (data?.status === 'failed') {
      setState('failed')
      setMessage('Payment failed or was cancelled. No enrollment was created. You can safely try again.')
      setPendingOrderId('')
    } else {
      setState('idle')
      setMessage('')
      setPendingOrderId('')
    }
  }, [identity])

  useEffect(() => {
    let active = true
    if (isAuthLoading) return () => { active = false }
    if (!isAuthenticated || user?.role !== 'student') return () => { active = false }

    getCoursePaymentStatus(courseSlug)
      .then((response) => {
        if (active) applyBackendStatus(response)
      })
      .catch(() => {
        if (!active) return
        setConfirmedIdentity(identity)
        setState('verification_pending')
        setMessage('Unable to confirm enrollment status. Please check again before retrying checkout.')
      })
    return () => { active = false }
  }, [applyBackendStatus, courseSlug, identity, isAuthenticated, isAuthLoading, unavailable, user?.role])

  const checkPaymentStatus = async () => {
    if (statusPendingRef.current || !isAuthenticated || user?.role !== 'student') return
    statusPendingRef.current = true
    setState('verifying')
    try {
      const response = await getCoursePaymentStatus(courseSlug, pendingOrderId)
      applyBackendStatus(response, Boolean(pendingOrderId))
    } catch {
      if (mountedRef.current) {
        setState('verification_pending')
        setMessage('Payment verification pending')
      }
    } finally {
      statusPendingRef.current = false
    }
  }

  const startCheckout = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location } }); return }
    if (user?.role !== 'student' || unavailable || (state !== 'idle' && state !== 'failed') || checkoutPendingRef.current) return
    checkoutPendingRef.current = true
    setState('creating')
    setMessage('')
    try {
      const order = (await createPaymentOrder(course.slug)).data?.data
      if (order?.status === 'pending') {
        if (mountedRef.current) {
          setState('verification_pending')
          setMessage('Payment verification pending')
        }
        return
      }
      if (!order?.providerOrderId) throw new Error('Payment order was not returned.')
      await loadCheckout()
      setPendingOrderId(order.providerOrderId)
      await new Promise((resolve) => {
        let responseReceived = false
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'CadTech Solution',
          description: order.courseTitle,
          order_id: order.providerOrderId,
          handler: async (response) => {
            responseReceived = true
            if (mountedRef.current) setState('verifying')
            try {
              const result = await verifyPayment(response)
              const confirmedEnrollment = result?.data?.data?.enrollment
              if (mountedRef.current && confirmedEnrollment) {
                setConfirmedIdentity(identity)
                setEnrollment(confirmedEnrollment)
                setPendingOrderId('')
                setState('paid/enrolled')
                setMessage('Payment successful! You are now enrolled in this course.')
              } else if (mountedRef.current) {
                setConfirmedIdentity(identity)
                setState('verification_pending')
                setMessage('Payment verification pending')
              }
            } catch {
              if (mountedRef.current) {
                setConfirmedIdentity(identity)
                setState('verification_pending')
                setMessage('Payment verification pending')
              }
            } finally {
              resolve()
            }
          },
          modal: {
            ondismiss: () => {
              if (!responseReceived && mountedRef.current) {
                setState('failed')
                setMessage('Payment was cancelled. No enrollment was created. You can safely try again.')
              }
              resolve()
            }
          }
        })
        if (typeof checkout.on === 'function') checkout.on('payment.failed', () => {
          responseReceived = true
          if (mountedRef.current) {
            setState('failed')
            setMessage('Payment failed. No enrollment was created. You can safely try again.')
          }
          resolve()
        })
        if (mountedRef.current) setState('checkout_open')
        checkout.open()
      })
    } catch (error) {
      if (mountedRef.current) {
        setConfirmedIdentity(identity)
        setState('failed')
        setMessage(error?.response?.data?.message || error?.message || 'Payment could not be started. Please try again.')
      }
    } finally {
      checkoutPendingRef.current = false
    }
  }

  const displayState = isAuthLoading
    ? 'checking_status'
    : !isAuthenticated || user?.role !== 'student'
      ? 'unauthenticated'
      : confirmedIdentity !== identity
        ? 'checking_status'
        : unavailable && state !== 'paid/enrolled' ? 'unavailable' : state

  if (displayState === 'paid/enrolled' && enrollment) {
    const hasStarted = Number(enrollment.progressPercentage) > 0 || Boolean(enrollment.lastAccessedAt)
    return <div className="checkout-wrap"><p className="checkout-message" role="status" aria-live="polite">{message}</p><button className="button button-primary checkout-button" type="button" onClick={() => navigate(`/student/learn/${courseSlug}`)}>{hasStarted ? 'Continue Learning' : 'Start Learning'}</button></div>
  }
  if (unavailable || displayState === 'unavailable') return <p className="checkout-unavailable" role="status" aria-live="polite">Enrollment currently unavailable.</p>
  if (displayState === 'unauthenticated') return isAuthenticated
    ? <p className="checkout-unavailable" role="status" aria-live="polite">Sign in with a student account to enroll.</p>
    : <div className="checkout-wrap"><button className="button button-primary checkout-button" type="button" onClick={startCheckout}>Buy Course</button></div>

  const pending = displayState === 'verification_pending'
  const processing = displayState === 'creating' || displayState === 'checkout_open' || displayState === 'verifying' || displayState === 'checking_status'
  const buttonLabel = displayState === 'creating'
    ? 'Preparing Checkout...'
    : displayState === 'verifying' ? 'Verifying Payment...'
      : displayState === 'checkout_open' ? 'Checkout Open...'
        : displayState === 'checking_status' ? 'Checking Enrollment...'
          : pending ? 'Check Payment Status' : 'Buy Course'
  return <div className="checkout-wrap"><button className="button button-primary checkout-button" type="button" disabled={processing} onClick={pending ? checkPaymentStatus : startCheckout}>{buttonLabel}</button>{message && <p className="checkout-message" role={displayState === 'failed' ? 'alert' : 'status'} aria-live={displayState === 'failed' ? 'assertive' : 'polite'}>{message}</p>}</div>
}
export default CourseCheckoutButton
