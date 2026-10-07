import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ModelCard from '../../common/ModelCard/ModelCard.jsx'
import ModelFilters from '../ModelFilters/ModelFilters.jsx'
import ModelPagination from '../ModelPagination/ModelPagination.jsx'
import ModelSearch from '../ModelSearch/ModelSearch.jsx'
import { getCadCategories, getCadProducts } from '../../../services/cadService.js'
import './ModelsCatalog.css'

const pageSize = 6

function ModelsCatalog({ selectedCategory = null }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [models, setModels] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const query = searchParams.get('q') ?? ''
  const selectedLevels = searchParams.getAll('level')
  const selectedFormats = searchParams.getAll('format')
  const sort = searchParams.get('sort') ?? 'featured'
  const requestedPage = Number(searchParams.get('page')) || 1

  useEffect(() => {
    const handleKeyDown = (event) => event.key === 'Escape' && setIsFilterOpen(false)
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = isFilterOpen ? 'hidden' : ''
    return () => { window.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [isFilterOpen])

  useEffect(() => {
    let active = true
    Promise.all([
      getCadCategories(),
      getCadProducts({
        page: requestedPage,
        limit: pageSize,
        search: query,
        category: selectedCategory || '',
        sort,
        format: selectedFormats[0] || '',
        pricing: 'all'
      })
    ]).then(([categoryItems, productResponse]) => {
      if (!active) return
      setCategories(categoryItems)
      setModels(productResponse.products || [])
      setTotalItems(productResponse.pagination?.totalItems || 0)
      setIsLoading(false)
    }).catch(() => {
      if (active) {
        setCategories([])
        setModels([])
        setTotalItems(0)
        setIsLoading(false)
      }
    })
    return () => { active = false }
  }, [query, requestedPage, selectedCategory, selectedFormats, sort])

  const categoryCounts = useMemo(() => {
    const counts = { all: totalItems }
    categories.forEach((category) => { counts[category.slug] = 0 })
    models.forEach((model) => {
      const slug = model.category?.slug || ''
      if (slug && counts[slug] !== undefined) counts[slug] += 1
    })
    return counts
  }, [categories, models, totalItems])

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return models.filter((model) => {
      const searchable = [model.title, model.category?.name || '', model.description, ...(Array.isArray(model.fileFormats) ? model.fileFormats : [])].join(' ').toLowerCase()
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesLevel = !selectedLevels.length || selectedLevels.includes(model.level || 'Featured')
      const matchesFormat = !selectedFormats.length || (Array.isArray(model.fileFormats) && model.fileFormats.some((format) => selectedFormats.includes(format)))
      return matchesQuery && matchesLevel && matchesFormat
    })
  }, [models, query, selectedLevels, selectedFormats])

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
  const pageModels = filteredModels
  const firstShown = filteredModels.length ? (currentPage - 1) * pageSize + 1 : 0
  const lastShown = Math.min(currentPage * pageSize, filteredModels.length)

  const updateParams = (updates = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      next.delete(key)
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
      else if (value) next.set(key, value)
    })
    setSearchParams(next)
  }
  const toggleParam = (key, value, currentValues) => updateParams({ [key]: currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value], page: '1' })
  const changeCategory = (category) => { setIsFilterOpen(false); navigate(category ? `/cad-models/${category}` : '/cad-models') }
  const clearFilters = () => { setIsFilterOpen(false); navigate('/cad-models') }

  return <div className="models-catalog-layout">
    <ModelFilters selectedCategory={selectedCategory} selectedLevels={selectedLevels} selectedFormats={selectedFormats} counts={categoryCounts} onCategoryChange={changeCategory} onLevelChange={(level) => toggleParam('level', level, selectedLevels)} onFormatChange={(format) => toggleParam('format', format, selectedFormats)} onClear={clearFilters} isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    {isFilterOpen && <button className="filters-backdrop" type="button" onClick={() => setIsFilterOpen(false)} aria-label="Close filters" />}
    <div className="models-catalog-main">
      <div className="catalog-toolbar"><ModelSearch value={query} onChange={(value) => updateParams({ q: value.trim() ? value : null, page: '1' })} onClear={() => updateParams({ q: null, page: '1' })} /><button className="mobile-filters-button" type="button" onClick={() => setIsFilterOpen(true)}><SlidersHorizontal size={17} /> Filters</button><div className="catalog-sort"><label htmlFor="model-sort">Sort by</label><select id="model-sort" value={sort} onChange={(event) => updateParams({ sort: event.target.value === 'featured' ? null : event.target.value, page: '1' })}><option value="featured">Featured First</option><option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option><option value="newest">Newest</option></select></div></div>
      <div className="catalog-result-summary"><span>{isLoading ? 'Loading CAD models...' : (filteredModels.length ? `Showing ${firstShown}-${lastShown} of ${filteredModels.length} ${filteredModels.length === 1 ? 'model' : 'models'}` : `Showing 0 of ${totalItems} ${totalItems === 1 ? 'model' : 'models'}`)}</span>{(query || selectedLevels.length || selectedFormats.length || sort !== 'featured') && <button type="button" onClick={clearFilters}>Clear Filters</button>}</div>
      {isLoading ? <div className="catalog-empty"><h2>Loading CAD models...</h2></div> : pageModels.length ? <div className="models-grid">{pageModels.map((model) => <ModelCard model={model} key={model.id} />)}</div> : <div className="catalog-empty"><SearchX size={42} aria-hidden="true" /><h2>No matching CAD models found</h2><p>Try adjusting your search or filters to find a suitable design.</p><button className="button button-primary" type="button" onClick={clearFilters}>Clear Filters</button></div>}
      <ModelPagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => updateParams({ page: String(page) })} />
    </div>
  </div>
}

export default ModelsCatalog