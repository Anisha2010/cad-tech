import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GalleryGrid from '../../common/GalleryGrid/GalleryGrid.jsx'
import Lightbox from '../../common/Lightbox/Lightbox.jsx'
import { getPublicPortfolio } from '../../../services/siteContentService.js'
import './OurWorkGallery.css'

const sectionLimit = 8

function OurWorkGallery() {
  const [projects, setProjects] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    let active = true
    getPublicPortfolio().then((response) => {
      if (!active) return
      const items = Array.isArray(response?.projects) ? response.projects : []
      setProjects(items.slice(0, sectionLimit))
    }).catch(() => {
      if (active) setProjects([])
    })
    return () => { active = false }
  }, [])

  const lightboxItems = useMemo(() => projects.map((project) => ({
    id: project.id || project._id,
    title: project.title,
    category: project.category || 'Project',
    summary: project.summary || '',
    imageUrl: project.imageUrl
  })), [projects])

  if (!projects.length) return null

  return (
    <section className="our-work-section" aria-labelledby="our-work-heading">
      <div className="site-container">
        <div className="our-work-heading-row">
          <div>
            <span className="categories-eyebrow">OUR WORK</span>
            <h2 className="section-heading" id="our-work-heading">Our Work Gallery</h2>
            <p className="section-description">A selection of CAD designs we have delivered across mechanical engineering, architecture, and 3D modelling.</p>
          </div>
          <Link className="view-all-link" to="/gallery">View All Projects <ArrowRight size={17} /></Link>
        </div>
        <GalleryGrid items={lightboxItems} onOpen={setActiveIndex} />
      </div>
      <Lightbox items={lightboxItems} index={activeIndex} onClose={() => setActiveIndex(-1)} onIndexChange={setActiveIndex} />
    </section>
  )
}

export default OurWorkGallery
