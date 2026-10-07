import { BookOpen, Compass, LogOut, MessageSquareText, LayoutDashboard, Settings, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchInstructorCourses } from '../../../services/instructorService.js'
import './InstructorSidebar.css'

const navigationItems = [
  { label: 'Dashboard', to: '/instructor/dashboard', Icon: LayoutDashboard },
  { label: 'My Courses', to: '/instructor/courses', Icon: BookOpen },
  { label: 'Assessments', to: '/instructor/assessments', Icon: LayoutDashboard },
  { label: 'Browse Courses', to: '/courses', Icon: Compass },
  { label: 'Contact Support', to: '/contact', Icon: MessageSquareText },
  { label: 'Account settings', to: '/instructor/profile', Icon: Settings }
]

function InstructorSidebar({ isOpen, onNavigate, onRequestLogout }) {
  const location = useLocation()
  const [firstCourseId, setFirstCourseId] = useState('')
  const courseId = location.pathname.match(/^\/instructor\/courses\/([^/]+)/)?.[1]

  useEffect(() => {
    let active = true
    fetchInstructorCourses({ limit: 1 }).then((result) => {
      const nextCourseId = result?.courses?.[0]?.id || ''
      if (active) setFirstCourseId(nextCourseId)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const submissionsCourseId = courseId || firstCourseId
  const submissionsPath = submissionsCourseId ? `/instructor/courses/${submissionsCourseId}/submissions` : ''
  const navigation = [...navigationItems.slice(0, 2), { label: 'Submissions', to: submissionsPath, Icon: MessageSquareText }, ...navigationItems.slice(2)]

  return (
    <>
      <div
        className={`instructor-sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onNavigate}
        aria-hidden="true"
      />
      <aside className={`instructor-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Instructor navigation" id="instructor-sidebar-nav">
        <div className="instructor-sidebar-header">
          <div className="instructor-brand-wrap" aria-label="CadTech Brand">
            <span className="instructor-brand-mark">C</span>
            <div>
              <span className="instructor-brand-name">CadTech</span>
              <strong>INSTRUCTOR PORTAL</strong>
            </div>
          </div>
          <button type="button" className="instructor-close-button" onClick={onNavigate} aria-label="Close instructor navigation">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="instructor-sidebar-nav" aria-label="Instructor portal navigation">
          {navigation.map(({ label, to, Icon }) => (
            !to ? <span key={label} className="instructor-nav-link" aria-disabled="true"><Icon size={18} aria-hidden="true" /><span>{label}</span></span> :
            <NavLink
              key={to + label}
              to={to}
              end
              onClick={onNavigate}
              className={({ isActive }) => {
                const isAssessmentActive = label === 'Assessments' && (/^\/instructor\/courses\/[^/]+\/assessments$/.test(location.pathname) || /^\/instructor\/courses\/[^/]+\/quizzes\//.test(location.pathname))
                return `instructor-nav-link${isActive || isAssessmentActive ? ' active' : ''}`
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="instructor-sidebar-logout" onClick={() => { onNavigate?.(); onRequestLogout() }}>
          <LogOut size={17} aria-hidden="true" />
          Logout
        </button>
      </aside>
    </>
  )
}

export default InstructorSidebar
