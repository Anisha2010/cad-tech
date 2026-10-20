import { SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GalleryGrid from '../../components/common/GalleryGrid/GalleryGrid.jsx'
import Lightbox from '../../components/common/Lightbox/Lightbox.jsx'
import { getPublicPortfolio } from '../../services/siteContentService.js'
import './Gallery.css'

function Gallery() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Our Work Gallery | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    let active = true
    getPublicPortfolio().then((response) => {
      if (!active) return
      setProjects(Array.isArray(response?.projects) ? response.projects : [])
      setIsLoading(false)
    }).catch(() => {
      if (active) {
        setProjects([])
        setIsLoading(false)
      }
    })
    return () => { active = false }
  }, [])

  const items = useMemo(() => projects.map((project) => ({
    id: project.id || project._id,
    title: project.title,
    category: project.category || 'Project',
    summary: project.summary || '',
    imageUrl: project.imageUrl
  })), [projects])

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], [items])

  const visibleItems = useMemo(
    () => (activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory)),
    [items, activeCategory]
  )

  const selectCategory = (category) => {
    setActiveCategory(category)
    setActiveIndex(-1)
  }

  return (
    <main className="gallery-page">
      <div className="site-container">
        <div className="gallery-page-heading">
          <nav className="gallery-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Gallery</span>
          </nav>
          <span className="gallery-eyebrow">OUR WORK</span>
          <h1>Our Work Gallery</h1>
          <p>Browse CAD designs delivered across mechanical engineering, architecture, 3D modelling, and electrical projects.</p>
        </div>

        {items.length > 1 && (
          <div className="gallery-filters" role="group" aria-label="Filter projects by category">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className="gallery-filter"
                aria-pressed={activeCategory === category}
                onClick={() => selectCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="gallery-status" role="status">Loading projects...</p>
        ) : visibleItems.length ? (
          <GalleryGrid items={visibleItems} onOpen={setActiveIndex} />
        ) : (
          <div className="gallery-empty">
            <SearchX size={42} aria-hidden="true" />
            <h2>No projects to show yet</h2>
            <p>Projects in this category will appear here once published.</p>
            <button className="button button-primary" type="button" onClick={() => selectCategory('All')}>Show All Projects</button>
          </div>
        )}

        <Lightbox items={visibleItems} index={activeIndex} onClose={() => setActiveIndex(-1)} onIndexChange={setActiveIndex} />
      </div>
    </main>
  )
}

export default Gallery
