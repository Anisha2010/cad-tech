import './DashboardSkeleton.css'

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-live="polite">
      <div className="skeleton-row skeleton-summary" />
      <div className="skeleton-row skeleton-section" />
      <div className="skeleton-row skeleton-section" />
      <div className="skeleton-row skeleton-section" />
    </div>
  )
}

export default DashboardSkeleton
