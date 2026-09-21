import { LogOut, Menu } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '../../components/common/ThemeToggle/ThemeToggle.jsx'
import InstructorSidebar from '../../components/instructor/InstructorSidebar/InstructorSidebar.jsx'
import useAuth from '../../context/useAuth.jsx'
import './InstructorLayout.css'

const routeTitles = {
  dashboard: 'Dashboard',
  courses: 'My Courses',
  curriculum: 'Curriculum Builder',
  assessments: 'Assessments',
  'quizzes/new': 'Create Quiz',
  quizzes: 'Edit Quiz',
  'assignments/new': 'Create Assignment',
  assignments: 'Edit Assignment',
  edit: 'Edit Course'
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'I'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'I'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

function getRouteTitle(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] !== 'instructor') return 'Dashboard'

  if (segments[1] === 'dashboard') return routeTitles.dashboard
  if (segments[1] === 'courses' && segments.length === 2) return routeTitles.courses
  if (segments[1] === 'courses' && segments[2] && segments[3] === 'edit') return routeTitles.edit
  if (segments[1] === 'courses' && segments[3] === 'curriculum') return routeTitles.curriculum
  if (segments[1] === 'courses' && segments[3] === 'assessments') return routeTitles.assessments
  if (segments[1] === 'courses' && segments[3] === 'quizzes' && segments[4] === 'new') return routeTitles['quizzes/new']
  if (segments[1] === 'courses' && segments[3] === 'quizzes' && segments[4]) return routeTitles.quizzes
  if (segments[1] === 'courses' && segments[3] === 'assignments' && segments[4] === 'new') return routeTitles['assignments/new']
  if (segments[1] === 'courses' && segments[3] === 'assignments' && segments[4]) return routeTitles.assignments

  return routeTitles.dashboard
}

function InstructorLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isSidebarOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isSidebarOpen])

  const pageTitle = useMemo(() => getRouteTitle(location.pathname), [location.pathname])
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Instructor logout failed', error)
    }
  }

  return (
    <div className="instructor-shell">
      <InstructorSidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="instructor-main">
        <header className="instructor-topbar">
          <div className="instructor-topbar-left">
            <button
              type="button"
              className="instructor-menu-button"
              aria-label={isSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
              aria-controls="instructor-sidebar-nav"
              aria-expanded={isSidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <p className="instructor-topbar-title">Instructor {pageTitle}</p>
          </div>

          <div className="instructor-topbar-actions">
            <ThemeToggle />
            <div className="instructor-user-pill">
              <span className="instructor-user-avatar" aria-label={`${user?.name || 'Instructor'} profile initials`}>
                {getInitials(user?.name || 'Instructor')}
              </span>
              <div className="instructor-user-copy">
                <strong>{user?.name || 'Instructor'}</strong>
                <span>Instructor</span>
              </div>
            </div>
            <button type="button" className="instructor-logout-button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          </div>
        </header>

        <main className="instructor-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default InstructorLayout
