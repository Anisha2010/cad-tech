import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import EnrollmentCard from '../../../components/student/EnrollmentCard.jsx'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { getStudentEnrollments } from '../../../services/studentService.js'
import useAuth from '../../../context/useAuth.jsx'
import './MyCourses.css'

function MyCourses() {
  const [courses, setCourses] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [retryToken, setRetryToken] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300); return () => clearTimeout(timer) }, [search])
  useEffect(() => { setPage(1) }, [status])
  useEffect(() => { let active = true; setIsLoading(true); setError(''); getStudentEnrollments({ search: debouncedSearch, status, page }).then((result) => { if (!active) return; setCourses(result.enrollments); setPagination(result.pagination) }).catch(async (requestError) => { if (!active) return; if (requestError?.response?.status === 401) { await refreshUser(); navigate('/login', { replace: true, state: { from: location } }); return } setError('Unable to load your courses right now.') }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [debouncedSearch, status, page, retryToken])
  const hasFilters = Boolean(search || status !== 'all')
  return <div className="student-dashboard-shell"><StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /><div className="student-dashboard-main"><StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} /><main className="my-courses-content"><header><p className="welcome-kicker">Learning Library</p><h1>My Courses</h1><p aria-live="polite">{pagination.totalItems} {pagination.totalItems === 1 ? 'course' : 'courses'}</p></header><div className="course-filters"><label htmlFor="course-search"><Search size={17} aria-hidden="true" />Search courses<input id="course-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your courses" /></label><label htmlFor="course-status"><SlidersHorizontal size={17} aria-hidden="true" />Status<select id="course-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All courses</option><option value="active">In progress</option><option value="completed">Completed</option></select></label></div>{isLoading && <p className="dashboard-status" role="status">Loading your courses...</p>}{error && <div className="dashboard-error" role="alert"><div><strong>{error}</strong><p>Please try again in a moment.</p></div><button className="button button-outline" type="button" onClick={() => setRetryToken((current) => current + 1)}><RefreshCw size={16} /> Try Again</button></div>}{!isLoading && !error && courses.length > 0 && <><div className="enrollment-grid">{courses.map((course) => <EnrollmentCard key={course.id} enrollment={course} />)}</div>{pagination.totalPages > 1 && <nav className="pagination" aria-label="Course pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pagination.totalPages}</span><button type="button" disabled={page === pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}</>}{!isLoading && !error && courses.length === 0 && <section className="student-panel empty-state"><h2>{hasFilters ? 'No courses match your search.' : 'No enrolled courses yet'}</h2><p>{hasFilters ? 'Try changing your search or status filter.' : 'Courses purchased successfully will appear here.'}</p>{hasFilters ? <button className="button button-outline" type="button" onClick={() => { setSearch(''); setStatus('all') }}>Clear Filters</button> : <Link className="button button-primary" to="/courses">Browse Courses</Link>}</section>}</main></div></div>
}
export default MyCourses