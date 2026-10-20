import { Box, Expand } from 'lucide-react'
import './GalleryGrid.css'

function GalleryGrid({ items, onOpen }) {
  return (
    <div className="work-grid">
      {items.map((item, position) => (
        <button
          type="button"
          className="work-card"
          key={item.id || item._id || position}
          onClick={() => onOpen(position)}
          aria-label={`Preview ${item.title}`}
        >
          <span className="work-card-media">
            <span className="work-card-blueprint" aria-hidden="true" />
            <Box className="work-card-fallback-icon" size={54} strokeWidth={1.25} aria-hidden="true" />
            <img
              className="work-card-image"
              src={item.imageUrl}
              alt={`${item.title} — ${item.category} project`}
              loading="lazy"
              decoding="async"
              width="600"
              height="450"
              onError={(event) => { event.currentTarget.style.display = 'none' }}
            />
            <span className="work-card-expand" aria-hidden="true"><Expand size={16} /></span>
          </span>
          <span className="work-card-overlay">
            <span className="work-card-category">{item.category}</span>
            <span className="work-card-title">{item.title}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export default GalleryGrid
