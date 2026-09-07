import { BookOpen, Bookmark, CircleCheckBig, PlayCircle } from 'lucide-react'
import './DashboardSummary.css'

const summaryConfig = [
  { id: 'enrolled', label: 'Enrolled Courses', icon: BookOpen },
  { id: 'inProgress', label: 'In Progress', icon: PlayCircle },
  { id: 'completed', label: 'Completed Courses', icon: CircleCheckBig },
  { id: 'saved', label: 'Saved Models', icon: Bookmark },
]

function DashboardSummary({ summary, isLoading }) {
  if (isLoading) {
    return <div className="summary-grid summary-loading" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="summary-card skeleton-card" aria-hidden="true" />
      ))}
    </div>
  }

  const values = {
    enrolled: Number(summary?.enrolledCourses ?? 0),
    inProgress: Number(summary?.inProgressCourses ?? 0),
    completed: Number(summary?.completedCourses ?? 0),
    saved: Number(summary?.savedModels ?? 0),
  }

  return (
    <div className="summary-grid" aria-label="Student dashboard summary cards">
      {summaryConfig.map(({ id, label, icon: Icon }) => (
        <article key={id} className="summary-card" aria-label={`${label}, ${values[id]}`}>
          <div className="summary-icon-wrap">
            <Icon size={18} />
          </div>
          <div className="summary-meta">
            <span className="summary-label">{label}</span>
            <strong className="summary-value">{values[id]}</strong>
          </div>
        </article>
      ))}
    </div>
  )
}

export default DashboardSummary
