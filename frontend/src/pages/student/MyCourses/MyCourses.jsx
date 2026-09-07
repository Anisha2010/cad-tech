import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EnrollmentCard from '../../../components/student/EnrollmentCard.jsx'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { fetchMyCourses } from '../../../services/studentService.js'
import './MyCourses.css'

function MyCourses() {
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { fetchMyCourses().then(setCourses).catch(() => setError('Unable to load your courses right now.')) }, [])
  return <div className="student-dashboard-shell"><StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /><div className="student-dashboard-main"><StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} /><main className="my-courses-content"><header><p className="welcome-kicker">Learning Library</p><h1>My Courses</h1><p>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</p></header>{error && <p role="alert">{error}</p>}{courses.length ? <div className="enrollment-grid">{courses.map((course) => <EnrollmentCard key={course.id} enrollment={course} />)}</div> : !error && <section className="student-panel empty-state"><h2>No enrolled courses yet</h2><p>Courses purchased successfully will appear here.</p><Link className="button button-primary" to="/courses">Browse Courses</Link></section>}</main></div></div>
}
export default MyCourses