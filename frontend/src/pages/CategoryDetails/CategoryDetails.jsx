import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ModelsCatalog from '../../components/models/ModelsCatalog/ModelsCatalog.jsx'
import { getCadCategories } from '../../services/cadService.js'
import './CategoryDetails.css'

function CategoryDetails() {
  const { category: categorySlug } = useParams()
  const [category, setCategory] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    getCadCategories().then((categories) => {
      if (!active) return
      const selected = categories.find((item) => item.slug === categorySlug) || null
      setCategory(selected)
      setIsLoading(false)
    }).catch(() => {
      if (active) {
        setCategory(null)
        setIsLoading(false)
      }
    })
    return () => { active = false }
  }, [categorySlug])

  useEffect(() => {
    const previousTitle = document.title
    document.title = category ? `${category.name} Models | CadTech Solution` : 'Category Not Found | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [category])

  if (isLoading) return <main className="category-details page-placeholder"><h1>Loading category...</h1></main>
  if (!category) return <main className="category-details page-placeholder"><h1>Category not found</h1><Link className="button button-primary" to="/cad-models">Browse All CAD Models</Link></main>

  return <main className="category-details"><div className="site-container"><div className="category-catalog-heading"><nav className="category-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/cad-models">CAD Models</Link><span>/</span><span aria-current="page">{category.name}</span></nav><span className="categories-eyebrow">EXPLORE PROFESSIONAL DESIGNS</span><h1>{category.name} Models</h1><p>{category.description}</p></div><ModelsCatalog selectedCategory={category.slug} /></div></main>
}

export default CategoryDetails
