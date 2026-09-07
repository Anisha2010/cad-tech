import { SlidersHorizontal, X } from 'lucide-react'
import categories from '../../../data/categories.js'
import './ModelFilters.css'

const levels = ['Beginner', 'Intermediate', 'Advanced']
const formats = ['STEP', 'IGES', 'STL', 'SLDPRT', 'DWG']

function ModelFilters({ selectedCategory, selectedLevels, selectedFormats, counts, onCategoryChange, onLevelChange, onFormatChange, onClear, isOpen, onClose }) {
  return <aside className={`model-filters ${isOpen ? 'is-open' : ''}`} aria-label="Model filters"><div className="filters-header"><h2><SlidersHorizontal size={18} /> Filters</h2><button className="filters-close" type="button" onClick={onClose} aria-label="Close filters"><X size={19} /></button></div><div className="filter-group"><h3>Category</h3><label className={selectedCategory === null ? 'is-selected' : ''}><input type="radio" name="category" checked={selectedCategory === null} onChange={() => onCategoryChange(null)} /><span>All Categories</span><small>{counts.all}</small></label>{categories.map((category) => <label className={selectedCategory === category.slug ? 'is-selected' : ''} key={category.id}><input type="radio" name="category" checked={selectedCategory === category.slug} onChange={() => onCategoryChange(category.slug)} /><span>{category.title}</span><small>{counts[category.slug] ?? 0}</small></label>)}</div><div className="filter-group"><h3>Difficulty level</h3>{levels.map((level) => <label key={level}><input type="checkbox" checked={selectedLevels.includes(level)} onChange={() => onLevelChange(level)} /><span>{level}</span></label>)}</div><div className="filter-group"><h3>File format</h3>{formats.map((format) => <label key={format}><input type="checkbox" checked={selectedFormats.includes(format)} onChange={() => onFormatChange(format)} /><span>{format}</span></label>)}</div><button className="clear-filters-button" type="button" onClick={onClear}>Clear All Filters</button></aside>
}

export default ModelFilters