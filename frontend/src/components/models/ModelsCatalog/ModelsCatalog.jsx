import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ModelCard from '../../common/ModelCard/ModelCard.jsx'
import categories from '../../../data/categories.js'
import models from '../../../data/models.js'
import ModelFilters from '../ModelFilters/ModelFilters.jsx'
import ModelPagination from '../ModelPagination/ModelPagination.jsx'
import ModelSearch from '../ModelSearch/ModelSearch.jsx'
import './ModelsCatalog.css'

const levelOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 }
const pageSize = 6

function ModelsCatalog({ selectedCategory = null }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
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

  const categoryModels = selectedCategory ? models.filter((model) => model.categorySlug === selectedCategory) : models
  const categoryCounts = useMemo(() => categories.reduce((counts, category) => ({ ...counts, [category.slug]: models.filter((model) => model.categorySlug === category.slug).length }), { all: models.length }), [])
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return categoryModels.filter((model) => {
      const searchable = [model.title, model.category, model.description, ...model.formats].join(' ').toLowerCase()
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesLevel = !selectedLevels.length || selectedLevels.includes(model.level)
      const matchesFormat = !selectedFormats.length || model.formats.some((format) => selectedFormats.includes(format))
      return matchesQuery && matchesLevel && matchesFormat
    }).sort((first, second) => {
      if (sort === 'name-asc') return first.title.localeCompare(second.title)
      if (sort === 'name-desc') return second.title.localeCompare(first.title)
      if (sort === 'level') return levelOrder[first.level] - levelOrder[second.level] || first.title.localeCompare(second.title)
      return Number(second.featured) - Number(first.featured) || first.title.localeCompare(second.title)
    })
  }, [categoryModels, query, selectedLevels, selectedFormats, sort])

  const totalPages = Math.ceil(filteredModels.length / pageSize)
  const currentPage = Math.min(Math.max(requestedPage, 1), Math.max(totalPages, 1))
  const pageModels = filteredModels.slice((currentPage - 1) * pageSize, currentPage * pageSize)
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
      <div className="catalog-toolbar"><ModelSearch value={query} onChange={(value) => updateParams({ q: value.trim() ? value : null, page: '1' })} onClear={() => updateParams({ q: null, page: '1' })} /><button className="mobile-filters-button" type="button" onClick={() => setIsFilterOpen(true)}><SlidersHorizontal size={17} /> Filters</button><div className="catalog-sort"><label htmlFor="model-sort">Sort by</label><select id="model-sort" value={sort} onChange={(event) => updateParams({ sort: event.target.value === 'featured' ? null : event.target.value, page: '1' })}><option value="featured">Featured First</option><option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option><option value="level">Level: Beginner to Advanced</option></select></div></div>
      <div className="catalog-result-summary"><span>{filteredModels.length ? `Showing ${firstShown}-${lastShown} of ${filteredModels.length} ${filteredModels.length === 1 ? 'model' : 'models'}` : `Showing 0 of ${categoryModels.length} ${categoryModels.length === 1 ? 'model' : 'models'}`}</span>{(query || selectedLevels.length || selectedFormats.length || sort !== 'featured') && <button type="button" onClick={clearFilters}>Clear Filters</button>}</div>
      {pageModels.length ? <div className="models-grid">{pageModels.map((model) => <ModelCard model={model} key={model.id} />)}</div> : <div className="catalog-empty"><SearchX size={42} aria-hidden="true" /><h2>No matching CAD models found</h2><p>Try adjusting your search or filters to find a suitable design.</p><button className="button button-primary" type="button" onClick={clearFilters}>Clear Filters</button></div>}
      <ModelPagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => updateParams({ page: String(page) })} />
    </div>
  </div>
}

export default ModelsCatalog