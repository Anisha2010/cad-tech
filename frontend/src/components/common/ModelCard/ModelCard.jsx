import { ArrowRight, Box, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ModelCard.css'

function ModelCard({ model }) {
  const categoryName = model?.category?.name || model?.category || 'CAD Model'
  const formats = Array.isArray(model?.fileFormats) && model.fileFormats.length
    ? model.fileFormats
    : (Array.isArray(model?.formats) ? model.formats : [])
  const level = model?.level || 'Featured'
  const imageSrc = model?.thumbnailUrl || model?.image || ''

  return (
    <article className="model-card">
      <div className="model-image-wrap">
        <div className="model-blueprint" aria-hidden="true" />
        <Box className="model-fallback-icon" size={58} strokeWidth={1.25} aria-hidden="true" />
        <span className="model-fallback-label">CAD Preview</span>
        <img className="model-card-image" src={imageSrc} alt={`${model.title} CAD model preview`} loading="lazy" width="640" height="480" onError={(event) => { event.currentTarget.style.display = 'none' }} />
        <span className={`level-badge level-${String(level).toLowerCase()}`}>{level}</span>
      </div>
      <div className="model-card-content">
        <span className="model-category">{categoryName}</span>
        <h3>{model.title}</h3>
        <p>{model.description}</p>
        <div className="model-meta">
          <div className="format-list" aria-label="Supported formats">
            {formats.map((format) => <span key={format}>{format}</span>)}
          </div>
          <Download size={17} className="download-indicator" aria-label="Download available later" />
        </div>
        <Link className="model-details-link" to={`/model/${model.slug}`} aria-label={`View details for ${model.title}`}>View Details <ArrowRight size={16} /></Link>
      </div>
    </article>
  )
}

export default ModelCard