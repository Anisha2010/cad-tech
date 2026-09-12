import { useEffect, useState } from 'react'
import { fetchAdminCourses } from '../../services/adminCourseService.js'

function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetchAdminCourses({ page: 1, limit: 12 })
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
  }, [])

  return (
    <main className="page-placeholder">
      <h1>Course Management</h1>
      {loading && <p>Loading courses...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <div>
          {courses.length === 0 ? (
            <p>No courses yet. Create one from the admin catalog.</p>
          ) : (
            <ul>
              {courses.map((course) => (
                <li key={course.id}>
                  <strong>{course.title}</strong> — {course.status} — ₹{((course.priceInPaise ?? 0) / 100).toFixed(2)} — {course.enrollmentOpen ? 'Open' : 'Closed'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}

export default AdminCourses
