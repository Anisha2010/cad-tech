import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ModelCard from '../../common/ModelCard/ModelCard.jsx'
import models from '../../../data/models.js'
import './FeaturedModels.css'

function FeaturedModels() {
  const featuredModels = models.filter((model) => model.featured).slice(0, 3)
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
          {featuredModels.map((model) => <ModelCard model={model} key={model.id} />)}
        </div>
      </div>
    </section>
  )
}

export default FeaturedModels
