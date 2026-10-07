import { ArrowRight, Box, Building2, Settings, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCadCategories } from '../../../services/cadService.js'
import './Categories.css'

const categoryIcons = { Settings, Building2, Zap, Box }

function CategoryImage({ category, Icon }) {
  return (
    <div className="category-image-wrap">
      <div className="category-blueprint" aria-hidden="true" />
      <Icon className="category-fallback-icon" size={58} strokeWidth={1.3} aria-hidden="true" />
      <img
        className="category-card-image"
        src={category.imageUrl || category.image || ''}
        alt={`${category.name} CAD models`}
        loading="lazy"
        width="480"
        height="360"
        onError={(event) => { event.currentTarget.style.display = 'none' }}
      />
    </div>
  )
}

function Categories() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let active = true
    getCadCategories().then((items) => {
      if (active) setCategories(items)
    }).catch(() => {
      if (active) setCategories([])
    })
    return () => { active = false }
  }, [])

  return (
    <section className="categories-section" aria-labelledby="categories-heading">
      <div className="site-container">
        <div className="categories-heading-row">
          <div>
            <span className="categories-eyebrow">EXPLORE BY DISCIPLINE</span>
            <h2 className="section-heading" id="categories-heading">Explore CAD Categories</h2>
            <p className="section-description">Discover professional CAD models organized by engineering and design categories.</p>
          </div>
          <Link className="view-all-link" to="/cad-models">View All Categories <ArrowRight size={17} /></Link>
        </div>

        <div className="categories-grid">
          {categories.map((category) => {
            const Icon = categoryIcons[category.iconName] || Box
            return (
              <Link className="category-card" to={`/cad-models/${category.slug}`} key={category.id} aria-label={`Explore ${category.name} CAD models`}>
                <CategoryImage category={category} Icon={Icon} />
                <div className="category-card-content">
                  <div className="category-icon"><Icon size={19} aria-hidden="true" /></div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <span className="category-action">Explore <ArrowRight size={16} /></span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Categories