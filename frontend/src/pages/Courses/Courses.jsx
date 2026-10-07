import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CourseCard from '../../components/courses/CourseCard/CourseCard.jsx'
import CourseFilters from '../../components/courses/CourseFilters/CourseFilters.jsx'
import CourseSearch from '../../components/courses/CourseSearch/CourseSearch.jsx'
import { fetchPublicCourses } from '../../services/courseService.js'
import './Courses.css'

const pageSize = 6

function Courses() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, totalItems: 0, totalPages: 0 })

  const query = params.get('q') ?? ''
  const selectedLevels = params.getAll('level')
  const selectedSoftware = params.getAll('software')
  const selectedLevelsKey = selectedLevels.join('|')
  const selectedSoftwareKey = selectedSoftware.join('|')
  const selectedCategory = params.get('category') ?? ''
  const selectedDuration = params.get('duration') ?? ''
  const sort = params.get('sort') ?? 'featured'
  const requestedPage = Number(params.get('page')) || 1

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'CAD Courses | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setFiltersOpen(false)
    window.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = filtersOpen ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [filtersOpen])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    fetchPublicCourses({
      search: query,
      software: selectedSoftware.join(','),
      level: selectedLevels.join(','),
      category: selectedCategory,
      duration: selectedDuration,
      sort,
      page: requestedPage,
      limit: pageSize
    })
      .then((result) => {
        if (!active) return
        setCourses(result.courses ?? [])
        setPagination(result.pagination ?? { page: requestedPage, limit: pageSize, totalItems: 0, totalPages: 0 })
      })
      .catch(() => {
        if (active) setError('Unable to load courses right now.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [query, selectedLevelsKey, selectedSoftwareKey, selectedCategory, selectedDuration, sort, requestedPage])

  const totalPages = pagination.totalPages || 1
  const currentPage = Math.min(Math.max(requestedPage, 1), Math.max(totalPages, 1))

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      next.delete(key)
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
      else if (value) next.set(key, value)
    })
    setParams(next)
  }

  const toggle = (key, value, selected = []) => update({
    [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    page: '1'
  })

  const clear = () => {
    setFiltersOpen(false)
    setParams({})
  }

  const changeCategory = (value) => {
    setFiltersOpen(false)
    update({ category: value || null, page: '1' })
  }

  return (
    <main className="courses-page">
      <div className="site-container">
        <header className="courses-page-heading">
          <nav className="courses-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Courses</span>
          </nav>
          <span className="categories-eyebrow">PROFESSIONAL CAD TRAINING</span>
          <h1>Build Practical CAD and Engineering Skills</h1>
          <p>Explore structured courses in AutoCAD, SolidWorks, Revit, and other engineering design disciplines.</p>
        </header>

        <div className="courses-catalog-layout">
          <CourseFilters
            selectedLevels={selectedLevels}
            selectedSoftware={selectedSoftware}
            selectedCategory={selectedCategory}
            selectedDuration={selectedDuration}
            onToggle={toggle}
            onCategoryChange={changeCategory}
            onDurationChange={(value) => update({ duration: value, page: '1' })}
            onClear={clear}
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />

          {filtersOpen && <button className="course-filters-backdrop" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />}

          <div className="courses-catalog-main">
            <div className="courses-toolbar">
              <CourseSearch
                value={query}
                onChange={(value) => update({ q: value.trim() ? value : null, page: '1' })}
                onClear={() => update({ q: null, page: '1' })}
              />

              <button className="course-mobile-filter-button" type="button" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={17} /> Filters
              </button>

              <div className="course-sort">
                <label htmlFor="course-sort-select">Sort by</label>
                <select id="course-sort-select" value={sort} onChange={(event) => update({ sort: event.target.value === 'featured' ? null : event.target.value, page: '1' })}>
                  <option value="featured">Featured First</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                  <option value="duration-short">Duration: Shortest First</option>
                  <option value="duration-long">Duration: Longest First</option>
                  <option value="level">Level: Beginner to Advanced</option>
                </select>
              </div>
            </div>

            {loading && <p className="dashboard-status" role="status">Loading courses...</p>}
            {error && <p className="dashboard-error" role="alert">{error}</p>}

            {!loading && !error && (
              <>
                {courses.length ? (
                  <div className="courses-grid">
                    {courses.map((course) => <CourseCard key={course.id} course={course} />)}
                  </div>
                ) : (
                  <div className="page-placeholder">
                    <SearchX size={42} />
                    <h2>No courses available</h2>
                    <p>New published courses will appear here once they are added in the admin portal.</p>
                  </div>
                )}

                {totalPages > 1 && (
                  <nav className="course-pagination" aria-label="Course catalog pagination">
                    <button type="button" disabled={currentPage === 1} onClick={() => update({ page: String(currentPage - 1) })} aria-label="Previous page">‹</button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={page === currentPage ? 'is-current' : ''}
                        aria-current={page === currentPage ? 'page' : undefined}
                        onClick={() => update({ page: String(page) })}
                      >
                        {page}
                      </button>
                    ))}
                    <button type="button" disabled={currentPage === totalPages} onClick={() => update({ page: String(currentPage + 1) })} aria-label="Next page">›</button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Courses
