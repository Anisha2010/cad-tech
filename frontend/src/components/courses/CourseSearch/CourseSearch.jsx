import { Search, X } from 'lucide-react'
import './CourseSearch.css'

function CourseSearch({ value, onChange, onClear }) { return <div className="course-search"><Search size={19} aria-hidden="true" /><label className="visually-hidden" htmlFor="course-search-input">Search courses</label><input id="course-search-input" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search courses, software, or topics..." />{value && <button type="button" onClick={onClear} aria-label="Clear course search"><X size={17} /></button>}</div> }
export default CourseSearch