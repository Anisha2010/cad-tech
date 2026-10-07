import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { createCadPaymentOrder, getCadProductBySlug, verifyCadPayment } from '../../services/cadService.js'
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
  const { isAuthenticated } = useAuth()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentState, setPaymentState] = useState('idle')
  const [paymentMessage, setPaymentMessage] = useState('')

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

  if (loading) return <main className="model-details page-placeholder"><h1>Loading CAD model...</h1></main>
  if (!model) return <main className="model-details page-placeholder"><h1>CAD model not found.</h1><Link className="button button-primary" to="/cad-models">Back to CAD Models</Link></main>

  const categoryName = model?.category?.name || 'CAD Model'
  const formats = Array.isArray(model?.fileFormats) && model.fileFormats.length ? model.fileFormats : []
  const priceText = model?.isFree ? 'Free' : model?.priceInPaise ? `₹${(model.priceInPaise / 100).toFixed(2)}` : 'Price on request'

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/model/${slug}` } } })
      return
    }

    try {
      setPaymentState('creating')
      setPaymentMessage('')
      const order = (await createCadPaymentOrder(model.slug)).data?.data
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
    } catch (error) {
      setPaymentMessage(error.message === 'dismissed' ? 'Payment was not completed.' : 'Payment could not be verified. Please contact support if an amount was deducted.')
    } finally {
      setPaymentState('idle')
    }
  }

  return (
    <main className="model-details">
      <div className="site-container">
        <nav className="model-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={`/cad-models/${model.category?.slug || ''}`}>{categoryName}</Link><span>/</span><span aria-current="page">{model.title}</span></nav>
        <div className="model-detail-grid">
          <div className="model-detail-image"><div className="model-blueprint" aria-hidden="true" /><BoxFallback /><img src={model.thumbnailUrl || model.galleryImages?.[0] || ''} alt={`${model.title} CAD model preview`} width="720" height="540" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>
          <div className="model-detail-copy"><span className="model-category">{categoryName}</span><h1>{model.title}</h1><p>{model.description}</p><div className="detail-formats"><strong>Supported formats</strong><div className="format-list">{formats.map((format) => <span key={format}>{format}</span>)}</div></div><div className="detail-price-row"><strong>{priceText}</strong>{model.purchaseAvailable && <button className="button button-primary" type="button" disabled={paymentState !== 'idle'} onClick={handleCheckout}>{paymentState === 'creating' ? 'Preparing Checkout...' : paymentState === 'verifying' ? 'Verifying Payment...' : 'Buy Model'}</button>}</div>{paymentMessage && <p className="checkout-message" role="status" aria-live="polite">{paymentMessage}</p>}<p className="detail-note">Complete model information and download options will be added here.</p><Link className="button button-outline" to="/cad-models"><ArrowLeft size={17} /> Back to CAD Models</Link></div>
        </div>
      </div>
    </main>
  )
}

function BoxFallback() { return <span className="detail-image-fallback">CAD Preview</span> }
export default ModelDetails