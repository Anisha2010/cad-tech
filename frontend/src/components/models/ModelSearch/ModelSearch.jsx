import { Search, X } from 'lucide-react'
import './ModelSearch.css'

function ModelSearch({ value, onChange, onClear }) {
  return <div className="model-search"><Search size={19} aria-hidden="true" /><label className="visually-hidden" htmlFor="model-search-input">Search CAD models</label><input id="model-search-input" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search CAD models..." />{value && <button type="button" onClick={onClear} aria-label="Clear model search"><X size={17} /></button>}</div>
}

export default ModelSearch