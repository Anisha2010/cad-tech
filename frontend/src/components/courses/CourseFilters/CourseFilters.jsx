import { SlidersHorizontal, X } from 'lucide-react'
import './CourseFilters.css'

const levels = ['Beginner', 'Intermediate', 'Advanced']
const software = ['AutoCAD', 'SolidWorks', 'Revit', 'AutoCAD Electrical', 'General CAD']
const categories = ['Mechanical Design', 'Architecture', 'Electrical Design', 'Product Design', '2D Drafting']
const durations = [{ label: 'Under 5 hours', value: 'under-5' }, { label: '5–8 hours', value: '5-8' }, { label: 'More than 8 hours', value: 'over-8' }]

function CourseFilters({ selectedLevels, selectedSoftware, selectedCategory, selectedDuration, onToggle, onCategoryChange, onDurationChange, onClear, isOpen, onClose }) {
  return <aside className={`course-filters ${isOpen ? 'is-open' : ''}`} aria-label="Course filters"><div className="course-filters-header"><h2><SlidersHorizontal size={18} /> Filters</h2><button type="button" className="course-filters-close" onClick={onClose} aria-label="Close filters"><X size={19} /></button></div><FilterGroup title="Difficulty"><CheckList values={levels} selected={selectedLevels} onToggle={(value) => onToggle('level', value)} /></FilterGroup><FilterGroup title="Software"><CheckList values={software} selected={selectedSoftware} onToggle={(value) => onToggle('software', value)} /></FilterGroup><FilterGroup title="Category"><CheckList values={categories} selected={selectedCategory ? [selectedCategory] : []} onToggle={onCategoryChange} single /></FilterGroup><div className="course-filter-group"><h3>Duration</h3>{durations.map((duration) => <label key={duration.value}><input type="radio" name="course-duration" checked={selectedDuration === duration.value} onChange={() => onDurationChange(selectedDuration === duration.value ? null : duration.value)} /><span>{duration.label}</span></label>)}</div><button className="course-clear-button" type="button" onClick={onClear}>Clear Filters</button></aside>
}
function FilterGroup({ title, children }) { return <div className="course-filter-group"><h3>{title}</h3>{children}</div> }
function CheckList({ values, selected, onToggle, single = false }) { return values.map((value) => <label className={selected.includes(value) ? 'is-selected' : ''} key={value}><input type={single ? 'radio' : 'checkbox'} checked={selected.includes(value)} onChange={() => onToggle(value)} /><span>{value}</span></label>) }
export default CourseFilters