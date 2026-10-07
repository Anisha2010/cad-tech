import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ModelCard from '../../common/ModelCard/ModelCard.jsx'
import { getCadProducts } from '../../../services/cadService.js'
import './FeaturedModels.css'

function FeaturedModels() {
  const [models, setModels] = useState([])

  useEffect(() => {
    let active = true
    getCadProducts({ limit: 3, page: 1 }).then((response) => {
      if (active) setModels((response.products || []).filter((product) => product.featured).slice(0, 3))
    }).catch(() => {
      if (active) setModels([])
    })
    return () => { active = false }
  }, [])

  return (
    <section className="featured-models-section" aria-labelledby="featured-models-heading">
      <div className="site-container">
        <div className="featured-heading-row">
          <div>
            <span className="categories-eyebrow">POPULAR DESIGNS</span>
            <h2 className="section-heading" id="featured-models-heading">Featured CAD Models</h2>
            <p className="section-description">Explore professionally designed CAD models ready for engineering, learning, and product development.</p>
          </div>
          <Link className="view-all-link" to="/cad-models">View All Models <ArrowRight size={17} /></Link>
        </div>
        <div className="featured-models-grid">
          {models.map((model) => <ModelCard model={model} key={model.id} />)}
        </div>
      </div>
    </section>
  )
}

export default FeaturedModels
