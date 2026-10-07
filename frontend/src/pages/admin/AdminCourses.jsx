import { Plus, Archive, Edit3, Search, BookOpenText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { archiveAdminCourse, fetchAdminCourses, updateAdminCourseStatus } from '../../services/adminCourseService.js'
import './AdminCourses.css'

function AdminCourses() {
  const location = useLocation()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [software, setSoftware] = useState('')
  const [status, setStatus] = useState('all')
  const [reload, setReload] = useState(0)
  const [success, setSuccess] = useState(location.state?.notice || '')

  useEffect(() => {
    let active = true

    fetchAdminCourses({ search, software, status, page: 1, limit: 50 })
      .then((result) => {
        if (!active) return
        setCourses(result.courses ?? [])
      })
      .catch(() => {
        if (active) setError('Unable to load admin courses.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [search, software, status, reload])

  const changeStatus = async (course) => {
    if (!window.confirm(`${course.status === 'published' ? 'Archive' : 'Publish'} ${course.title}?`)) return
    try {
      if (course.status === 'published') await archiveAdminCourse(course.id)
      else await updateAdminCourseStatus(course.id, 'published')
      setError('')
      setSuccess(`Course ${course.status === 'published' ? 'archived' : 'published'} successfully.`)
      setReload((value) => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update course status.')
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><p className="admin-kicker">CATALOG CONTROL</p><h1>Course Management</h1><p>Manage MongoDB-backed course details, pricing, and publication.</p></div><Link className="button button-primary" to="/admin/courses/new"><Plus size={17} /> Add Course</Link></header>
      <div className="admin-filters"><label><Search size={16} /> Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, slug, or software" /></label><label>Software<select value={software} onChange={(event) => setSoftware(event.target.value)}><option value="">All software</option><option>AutoCAD</option><option>SolidWorks</option><option>Revit</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
      {loading && <p className="admin-state">Loading courses...</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}
      {!loading && !error && (
        courses.length === 0 ? <p className="admin-state">No courses match these filters.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Course</th><th>Software</th><th>Level</th><th>Price</th><th>Enrollment</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.title}</strong><small>{course.slug}</small></td><td>{course.software}</td><td>{course.level}</td><td>{Number.isInteger(course.priceInPaise) ? `₹${(course.priceInPaise / 100).toFixed(2)}` : 'Not configured'}</td><td>{course.enrollmentOpen ? 'Open' : 'Closed'}</td><td>{course.status[0].toUpperCase() + course.status.slice(1)}</td><td>{course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '-'}</td><td className="admin-actions"><Link to={`/admin/courses/${course.id}/edit`} aria-label={`Edit ${course.title}`}><Edit3 size={16} /></Link><Link to={`/admin/courses/${course.id}/curriculum`} aria-label={`Manage curriculum for ${course.title}`}><BookOpenText size={16} /></Link>{course.status !== 'archived' && <button type="button" onClick={() => changeStatus(course)} aria-label={`${course.status === 'published' ? 'Archive' : 'Publish'} ${course.title}`}><Archive size={16} /></button>}</td></tr>)}</tbody></table></div>
      )}
    </main>
  )
}

export default AdminCourses
