import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { checkCadProductAccess } from '../../services/cadDownloadService.js'
import { createCadPaymentOrder, getCadProductBySlug, verifyCadPayment } from '../../services/cadService.js'
import { getCadPurchasePresentation } from '../../utils/cadDownloads.js'
import './ModelDetails.css'

let checkoutPromise
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!checkoutPromise) checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Unable to load payment checkout.'))
    document.body.appendChild(script)
  })
  return checkoutPromise
}

function ModelDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ownershipStatus, setOwnershipStatus] = useState('idle')
  const [ownershipRefresh, setOwnershipRefresh] = useState(0)
  const [paymentState, setPaymentState] = useState('idle')
  const [paymentMessage, setPaymentMessage] = useState('')
  const checkoutIntentRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getCadProductBySlug(slug).then((product) => {
      if (active) {
        setModel(product)
        setLoading(false)
      }
    }).catch(() => {
      if (active) {
        setModel(null)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (isAuthLoading || !model?.id || !isAuthenticated || user?.role !== 'student') return undefined

    let active = true
    setOwnershipStatus('checking')
    checkCadProductAccess(model.id)
      .then(({ hasAccess }) => {
        if (active) setOwnershipStatus(hasAccess ? 'owned' : 'not-owned')
      })
      .catch(() => {
        if (active) setOwnershipStatus('error')
      })

    return () => { active = false }
  }, [isAuthLoading, isAuthenticated, model?.id, ownershipRefresh, user?.id, user?.role])

  if (loading) return <main className="model-details page-placeholder"><h1>Loading CAD model...</h1></main>
  if (!model) return <main className="model-details page-placeholder"><h1>CAD model not found.</h1><Link className="button button-primary" to="/cad-models">Back to CAD Models</Link></main>

  const categoryName = model?.category?.name || 'CAD Model'
  const formats = Array.isArray(model?.fileFormats) && model.fileFormats.length ? model.fileFormats : []
  const priceText = model?.isFree ? 'Free' : model?.priceInPaise ? `₹${(model.priceInPaise / 100).toFixed(2)}` : 'Price on request'
  const purchasePresentation = getCadPurchasePresentation({
    isAuthLoading,
    isAuthenticated,
    role: user?.role,
    ownershipStatus,
    purchaseAvailable: model.purchaseAvailable
  })

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/model/${slug}` } } })
      return
    }

    try {
      setPaymentState('creating')
      setPaymentMessage('')
      const intentStorageKey = `cad-order-intent:${user.id}:${model.slug}`
      if (checkoutIntentRef.current?.storageKey !== intentStorageKey) {
        const storedKey = window.sessionStorage.getItem(intentStorageKey)
        checkoutIntentRef.current = {
          storageKey: intentStorageKey,
          idempotencyKey: /^[A-Za-z0-9_-]{16,128}$/.test(storedKey || '') ? storedKey : crypto.randomUUID()
        }
        window.sessionStorage.setItem(intentStorageKey, checkoutIntentRef.current.idempotencyKey)
      }
      const order = (await createCadPaymentOrder(model.slug, checkoutIntentRef.current.idempotencyKey)).data?.data
      window.sessionStorage.removeItem(intentStorageKey)
      checkoutIntentRef.current = null
      await loadCheckout()
      setPaymentState('verifying')
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'CadTech Solution',
          description: order.productTitle,
          order_id: order.providerOrderId,
          handler: async (response) => {
            try {
              await verifyCadPayment(response)
              resolve()
            } catch (error) {
              reject(error)
            }
          },
          modal: { ondismiss: () => reject(new Error('dismissed')) }
        })
        checkout.open()
      })
      setPaymentMessage('Payment verified. Your CAD model order has been recorded.')
      setOwnershipRefresh((refresh) => refresh + 1)
    } catch (error) {
      const errorCode = error.response?.data?.code
      if (['CAD_ORDER_RETRY_REQUIRED', 'CAD_ORDER_ALREADY_COMPLETED', 'CAD_ORDER_IDEMPOTENCY_KEY_REUSED'].includes(errorCode)) {
        if (checkoutIntentRef.current?.storageKey) window.sessionStorage.removeItem(checkoutIntentRef.current.storageKey)
        checkoutIntentRef.current = null
      }
      if (errorCode === 'CAD_ORDER_PENDING') {
        setPaymentMessage('Checkout is still being prepared. Please retry shortly; a second order will not be created.')
      } else if (errorCode === 'CAD_ORDER_REVIEW_REQUIRED') {
        setPaymentMessage('Checkout needs review before another order can be created. Please contact support.')
      } else {
        setPaymentMessage(error.message === 'dismissed' ? 'Payment was not completed.' : 'Payment could not be verified. Please contact support if an amount was deducted.')
      }
    } finally {
      setPaymentState('idle')
    }
  }

  const renderPurchaseAction = () => {
    if (purchasePresentation === 'owned') {
      return (
        <>
          <span className="purchase-owned" role="status">Purchased</span>
          <Link className="button button-outline" to="/student/downloads">Go to My Downloads</Link>
        </>
      )
    }
    if (purchasePresentation === 'checking') return <span role="status">Checking purchase status...</span>
    if (purchasePresentation === 'error') {
      return (
        <>
          <span role="alert">Unable to verify ownership. Please try again before purchasing.</span>
          <button
            className="button button-outline"
            type="button"
            onClick={() => {
              setOwnershipStatus('idle')
              setOwnershipRefresh((refresh) => refresh + 1)
            }}
          >
            Retry
          </button>
        </>
      )
    }
    if (purchasePresentation === 'student-required') return <span role="status">Sign in with a student account to purchase this model.</span>
    if (purchasePresentation !== 'purchase') return null

    return (
      <button className="button button-primary" type="button" disabled={paymentState !== 'idle'} onClick={handleCheckout}>
        {paymentState === 'creating' ? 'Preparing Checkout...' : paymentState === 'verifying' ? 'Verifying Payment...' : 'Buy Model'}
      </button>
    )
  }

  return (
    <main className="model-details">
      <div className="site-container">
        <nav className="model-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={`/cad-models/${model.category?.slug || ''}`}>{categoryName}</Link><span>/</span><span aria-current="page">{model.title}</span></nav>
        <div className="model-detail-grid">
          <div className="model-detail-image"><div className="model-blueprint" aria-hidden="true" /><BoxFallback /><img src={model.thumbnailUrl || model.galleryImages?.[0] || ''} alt={`${model.title} CAD model preview`} width="720" height="540" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>
          <div className="model-detail-copy">
            <span className="model-category">{categoryName}</span>
            <h1>{model.title}</h1>
            <p>{model.description}</p>
            <div className="detail-formats">
              <strong>Supported formats</strong>
              <div className="format-list">{formats.map((format) => <span key={format}>{format}</span>)}</div>
            </div>
            <div className="detail-price-row">
              <strong>{priceText}</strong>
              {renderPurchaseAction()}
            </div>
            {paymentMessage && <p className="checkout-message" role="status" aria-live="polite">{paymentMessage}</p>}
            <p className="detail-note">Complete model information and download options will be added here.</p>
            <Link className="button button-outline" to="/cad-models"><ArrowLeft size={17} /> Back to CAD Models</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function BoxFallback() { return <span className="detail-image-fallback">CAD Preview</span> }
export default ModelDetails