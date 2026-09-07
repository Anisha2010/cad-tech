import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import categories from '../../data/categories.js'
import ModelsCatalog from '../../components/models/ModelsCatalog/ModelsCatalog.jsx'
import './CategoryDetails.css'

function CategoryDetails() {
  const { category: categorySlug } = useParams()
  const category = categories.find((item) => item.slug === categorySlug)

  useEffect(() => {
    const previousTitle = document.title
    document.title = category ? `${category.title} Models | CadTech Solution` : 'Category Not Found | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [category])

  if (!category) return <main className="category-details page-placeholder"><h1>Category not found</h1><Link className="button button-primary" to="/cad-models">Browse All CAD Models</Link></main>

  return <main className="category-details"><div className="site-container"><div className="category-catalog-heading"><nav className="category-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/cad-models">CAD Models</Link><span>/</span><span aria-current="page">{category.title}</span></nav><span className="categories-eyebrow">EXPLORE PROFESSIONAL DESIGNS</span><h1>{category.title} Models</h1><p>{category.description}</p></div><ModelsCatalog selectedCategory={category.slug} /></div></main>
}

export default CategoryDetails
