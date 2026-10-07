import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { getInstructors } from '../../services/adminCourseService.js'
import './AdminInstructors.css'

function AdminInstructors() {
  const [instructors, setInstructors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true

    getInstructors()
      .then((result) => {
        if (active) setInstructors(Array.isArray(result?.instructors) ? result.instructors : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load instructors.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [reload])

  const query = search.trim().toLowerCase()
  const filteredInstructors = query
    ? instructors.filter((instructor) => `${instructor.name || ''} ${instructor.email || ''}`.toLowerCase().includes(query))
    : instructors

  const retryLoad = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  return (
    <main className="admin-page admin-instructors-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">PEOPLE</p>
          <h1>Instructors</h1>
          <p>Instructor accounts available for course assignment. Account management is not provided by the current API.</p>
        </div>
        <button type="button" className="button button-outline" onClick={retryLoad} disabled={loading}>Refresh</button>
      </header>

      <label className="admin-instructors-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search instructors</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" disabled={loading || Boolean(error)} />
      </label>

      {loading ? <p className="admin-state" aria-live="polite">Loading instructors...</p> : error ? (
        <div className="admin-error" role="alert"><p>{error}</p><button type="button" className="button button-outline" onClick={retryLoad}>Retry</button></div>
      ) : filteredInstructors.length === 0 ? (
        <p className="admin-empty">{instructors.length === 0 ? 'No instructor accounts are available.' : 'No instructors match this search.'}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Account ID</th></tr></thead>
            <tbody>
              {filteredInstructors.map((instructor) => (
                <tr key={instructor.id}>
                  <td><strong>{instructor.name || 'Unnamed instructor'}</strong></td>
                  <td>{instructor.email || '-'}</td>
                  <td>{instructor.id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default AdminInstructors