import { BookOpen, Bookmark, CalendarDays, CheckCircle2, Headphones, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import useAuth from '../../../context/useAuth.jsx'
import { getStudentDashboard } from '../../../services/studentService.js'
import './StudentDashboard.css'

function firstName(name) {
  return name?.trim().split(/\s+/)[0] || 'Student'
}

function StudentDashboard() {
  const { user, refreshUser } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const loadDashboard = () => {
    setIsLoading(true)
    setError('')
    let active = true
    getStudentDashboard()
      .then((result) => { if (active) setDashboard(result) })
      .catch(async (requestError) => {
        if (!active) return
        if (requestError?.response?.status === 401) { await refreshUser(); navigate('/login', { replace: true, state: { from: location } }); return }
        setError('Unable to load your dashboard')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }

  useEffect(() => loadDashboard(), [])

  const displayUser = dashboard?.user ?? user
  const summary = dashboard?.summary

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
              <p className="welcome-description">Track your learning and continue your enrolled CAD courses.</p>
            </div>
            <div className="welcome-actions">
              <Link className="button button-primary" to="/courses"><BookOpen size={16} /> Browse Courses</Link>
              <Link className="button button-outline" to="/cad-models"><Bookmark size={16} /> Explore CAD Models</Link>
              <Link className="button button-outline" to="/contact"><Headphones size={16} /> Contact Support</Link>
            </div>
          </section>

          {isLoading && <div className="dashboard-skeleton" role="status" aria-live="polite">Loading your dashboard...</div>}
          {error && <div className="dashboard-error" role="alert"><div><strong>{error}</strong><p>Please try again in a moment.</p></div><button className="button button-outline" type="button" onClick={loadDashboard}><RefreshCw size={16} /> Try Again</button></div>}
          {!isLoading && !error && dashboard && <>
            <section className="summary-grid" aria-label="Learning summary">
              <SummaryCard icon={BookOpen} label="Enrolled Courses" value={summary.totalEnrollments} />
              <SummaryCard icon={RefreshCw} label="In Progress" value={summary.inProgress} />
              <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completed} />
            </section>
            <section className="student-panel" aria-labelledby="continue-heading">
              <div className="panel-header"><h3 id="continue-heading">Continue Learning</h3><Link to="/student/my-courses">View all</Link></div>
              {dashboard.continueLearning.length ? <div className="student-card-grid continue-grid">{dashboard.continueLearning.map((course) => <CourseCard key={course.id} enrollment={course} />)}</div> : <EmptyCourses />}
            </section>
            <section className="student-panel" aria-labelledby="recent-heading">
              <div className="panel-header"><h3 id="recent-heading">Recent Enrollments</h3><CalendarDays size={18} aria-hidden="true" /></div>
              {dashboard.recentEnrollments.length ? <div className="recent-list">{dashboard.recentEnrollments.map((enrollment) => <Link className="recent-item" key={enrollment.id} to={`/student/learn/${enrollment.courseSlug}`}><span><strong>{enrollment.courseTitle}</strong><small>{enrollment.software} · {enrollment.level}</small></span><time dateTime={enrollment.enrolledAt}>{new Date(enrollment.enrolledAt).toLocaleDateString()}</time></Link>)}</div> : <EmptyCourses />}
            </section>
          </>}
        </main>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }) { return <article className="summary-card"><Icon size={20} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></article> }
function CourseCard({ enrollment }) { return <article className="student-card"><div className="card-image-wrap"><img src={enrollment.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className="fallback-image">CAD</span></div><div className="card-body"><div className="card-topline"><span>{enrollment.software}</span><span>{enrollment.level}</span></div><h4>{enrollment.courseTitle}</h4><div className="progress-meta"><span>Progress</span><strong>{enrollment.progressPercentage}%</strong></div><progress className="accessible-progress" max="100" value={enrollment.progressPercentage}>{enrollment.progressPercentage}%</progress><Link className="button button-primary card-button" to={`/student/learn/${enrollment.courseSlug}`}>Open Course</Link></div></article> }
function EmptyCourses() { return <div className="empty-state"><BookOpen size={26} aria-hidden="true" /><h3>No enrolled courses yet</h3><p>Courses you enroll in will appear here.</p><Link className="button button-primary" to="/courses"><BookOpen size={16} /> Browse Courses</Link></div> }

export default StudentDashboard
