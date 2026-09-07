import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import models from '../../data/models.js'
import './ModelDetails.css'

function ModelDetails() {
  const { slug } = useParams()
  const model = models.find((item) => item.slug === slug)
  if (!model) return <main className="model-details page-placeholder"><h1>CAD model not found.</h1><Link className="button button-primary" to="/cad-models">Back to CAD Models</Link></main>
  return (
    <main className="model-details">
      <div className="site-container">
        <nav className="model-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={`/cad-models/${model.categorySlug}`}>{model.category}</Link><span>/</span><span aria-current="page">{model.title}</span></nav>
        <div className="model-detail-grid">
          <div className="model-detail-image"><div className="model-blueprint" aria-hidden="true" /><BoxFallback /><img src={model.image} alt={`${model.title} CAD model preview`} width="720" height="540" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>
          <div className="model-detail-copy"><span className="model-category">{model.category}</span><h1>{model.title}</h1><p>{model.description}</p><div className="detail-formats"><strong>Supported formats</strong><div className="format-list">{model.formats.map((format) => <span key={format}>{format}</span>)}</div></div><p className="detail-note">Complete model information and download options will be added here.</p><Link className="button button-outline" to="/cad-models"><ArrowLeft size={17} /> Back to CAD Models</Link></div>
        </div>
      </div>
    </main>
  )
}

function BoxFallback() { return <span className="detail-image-fallback">CAD Preview</span> }
export default ModelDetails