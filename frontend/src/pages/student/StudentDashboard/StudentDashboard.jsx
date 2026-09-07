import { BookOpen, Bookmark, Headphones } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import useAuth from '../../../context/useAuth.jsx'
import { fetchStudentDashboard } from '../../../services/studentService.js'
import './StudentDashboard.css'

function firstName(name) {
  return name?.trim().split(/\s+/)[0] || 'Student'
}

function StudentDashboard() {
  const { user } = useAuth()
  const [dashboardUser, setDashboardUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchStudentDashboard()
      .then((result) => {
        if (!active) return
        setDashboardUser(result?.data?.user ?? null)
        if (result?.error) setError(result.message)
      })
      .catch(() => { if (active) setError('Unable to load your dashboard right now.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const displayUser = dashboardUser ?? user

  return (
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="student-content-area">
          <section className="welcome-section" aria-labelledby="student-dashboard-heading">
            <div>
              <p className="welcome-kicker">Student Portal</p>
              <h2 id="student-dashboard-heading">Student Dashboard</h2>
              <p className="welcome-description">Welcome back, {firstName(displayUser?.name)}</p>
              <p className="welcome-description">Your courses, progress, and saved CAD resources will appear here.</p>
            </div>
            <div className="welcome-actions">
              <Link className="button button-primary" to="/courses"><BookOpen size={16} /> Browse Courses</Link>
              <Link className="button button-outline" to="/cad-models"><Bookmark size={16} /> Explore CAD Models</Link>
              <Link className="button button-outline" to="/contact"><Headphones size={16} /> Contact Support</Link>
            </div>
          </section>

          {isLoading && <p className="dashboard-status" role="status">Loading your profile...</p>}
          {error && <p className="dashboard-status dashboard-status-error" role="alert">{error}</p>}

          <section className="student-panel" aria-labelledby="courses-heading">
            <div className="empty-state">
              <BookOpen size={26} />
              <h3 id="courses-heading">No enrolled courses yet</h3>
              <p>Courses you enroll in will appear here.</p>
              <Link className="button button-primary" to="/courses"><BookOpen size={16} /> Browse Courses</Link>
            </div>
          </section>

          <section className="student-panel" aria-labelledby="models-heading">
            <div className="empty-state">
              <Bookmark size={26} />
              <h3 id="models-heading">No saved models yet</h3>
              <p>CAD models you save will appear here.</p>
              <Link className="button button-primary" to="/cad-models"><Bookmark size={16} /> Explore CAD Models</Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default StudentDashboard
