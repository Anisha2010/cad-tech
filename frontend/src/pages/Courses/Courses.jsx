import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CourseCard from '../../components/courses/CourseCard/CourseCard.jsx'
import CourseFilters from '../../components/courses/CourseFilters/CourseFilters.jsx'
import CourseSearch from '../../components/courses/CourseSearch/CourseSearch.jsx'
import courses from '../../data/courses.js'
import './Courses.css'

const levelOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 }
const pageSize = 6

function Courses() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = params.get('q') ?? ''
  const selectedLevels = params.getAll('level')
  const selectedSoftware = params.getAll('software')
  const selectedCategory = params.get('category') ?? ''
  const selectedDuration = params.get('duration') ?? ''
  const sort = params.get('sort') ?? 'featured'
  const requestedPage = Number(params.get('page')) || 1

  useEffect(() => { const previousTitle = document.title; document.title = 'CAD Courses | CadTech Solution'; return () => { document.title = previousTitle } }, [])
  useEffect(() => { const closeOnEscape = (event) => event.key === 'Escape' && setFiltersOpen(false); window.addEventListener('keydown', closeOnEscape); document.body.style.overflow = filtersOpen ? 'hidden' : ''; return () => { window.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = '' } }, [filtersOpen])

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const normalized = query.trim().toLowerCase()
    const searchable = [course.title, course.software, course.category, course.description, ...course.topics].join(' ').toLowerCase()
    const durationMatch = !selectedDuration || (selectedDuration === 'under-5' ? course.durationMinutes < 300 : selectedDuration === '5-8' ? course.durationMinutes >= 300 && course.durationMinutes <= 480 : course.durationMinutes > 480)
    return (!normalized || searchable.includes(normalized)) && (!selectedLevels.length || selectedLevels.includes(course.level)) && (!selectedSoftware.length || selectedSoftware.includes(course.software)) && (!selectedCategory || course.category === selectedCategory) && durationMatch
  }).sort((first, second) => sort === 'name-asc' ? first.title.localeCompare(second.title) : sort === 'name-desc' ? second.title.localeCompare(first.title) : sort === 'duration-short' ? first.durationMinutes - second.durationMinutes : sort === 'duration-long' ? second.durationMinutes - first.durationMinutes : sort === 'level' ? levelOrder[first.level] - levelOrder[second.level] : Number(second.featured) - Number(first.featured) || first.title.localeCompare(second.title)), [query, selectedLevels, selectedSoftware, selectedCategory, selectedDuration, sort])
  const totalPages = Math.ceil(filteredCourses.length / pageSize)
  const currentPage = Math.min(Math.max(requestedPage, 1), Math.max(totalPages, 1))
  const pageCourses = filteredCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const update = (changes) => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([key, value]) => { next.delete(key); if (Array.isArray(value)) value.forEach((item) => next.append(key, item)); else if (value) next.set(key, value) }); setParams(next) }
  const toggle = (key, value, selected) => update({ [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value], page: '1' })
  const clear = () => { setFiltersOpen(false); setParams({}) }
  const changeCategory = (value) => { setFiltersOpen(false); update({ category: value || null, page: '1' }) }

  return <main className="courses-page"><div className="site-container"><header className="courses-page-heading"><nav className="courses-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">Courses</span></nav><span className="categories-eyebrow">PROFESSIONAL CAD TRAINING</span><h1>Build Practical CAD and Engineering Skills</h1><p>Explore structured courses in AutoCAD, SolidWorks, Revit, and other engineering design disciplines.</p></header><div className="courses-catalog-layout"><CourseFilters selectedLevels={selectedLevels} selectedSoftware={selectedSoftware} selectedCategory={selectedCategory} selectedDuration={selectedDuration} onToggle={toggle} onCategoryChange={changeCategory} onDurationChange={(value) => update({ duration: value, page: '1' })} onClear={clear} isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} />{filtersOpen && <button className="course-filters-backdrop" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />}<div className="courses-catalog-main"><div className="courses-toolbar"><CourseSearch value={query} onChange={(value) => update({ q: value.trim() ? value : null, page: '1' })} onClear={() => update({ q: null, page: '1' })} /><button className="course-mobile-filter-button" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /> Filters</button><div className="course-sort"><label htmlFor="course-sort-select">Sort by</label><select id="course-sort-select" value={sort} onChange={(event) => update({ sort: event.target.value === 'featured' ? null : event.target.value, page: '1' })}><option value="featured">Featured First</option><option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option><option value="duration-short">Duration: Shortest First</option><option value="duration-long">Duration: Longest First</option><option value="level">Level: Beginner to Advanced</option></select></div></div><div className="course-result-summary"><span>Showing {filteredCourses.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredCourses.length)} of ${filteredCourses.length}` : `0 of ${courses.length}`} {filteredCourses.length === 1 ? 'course' : 'courses'}</span>{(query || selectedLevels.length || selectedSoftware.length || selectedCategory || selectedDuration || sort !== 'featured') && <button type="button" onClick={clear}>Clear Filters</button>}</div>{pageCourses.length ? <div className="courses-grid">{pageCourses.map((course) => <CourseCard course={course} key={course.id} />)}</div> : <div className="courses-empty"><SearchX size={42} /><h2>No matching courses found</h2><p>Try changing your search or filters to explore available courses.</p><button className="button button-primary" type="button" onClick={clear}>Clear Filters</button></div>}<CoursePagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => update({ page: String(page) })} /></div></div></div></main>
}

function CoursePagination({ currentPage, totalPages, onPageChange }) { if (totalPages <= 1) return null; return <nav className="course-pagination" aria-label="Course catalog pagination"><button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">‹</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button type="button" key={page} className={page === currentPage ? 'is-current' : ''} aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button>)}<button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">›</button></nav> }

export default Courses