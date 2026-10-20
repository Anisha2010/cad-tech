import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'

function NotFound() {
  useEffect(() => { const previousTitle = document.title; document.title = 'Page Not Found | CadTech Solution'; return () => { document.title = previousTitle } }, [])

  return (
    <main className="page-placeholder">
      <SearchX size={56} strokeWidth={1.4} aria-hidden="true" />
      <h1>Page Not Found</h1>
      <p>The page you are looking for doesn’t exist or may have been moved.</p>
      <div className="not-found-actions">
        <Link className="button button-primary" to="/">Back to Home</Link>
        <Link className="button button-outline" to="/courses"><ArrowLeft size={17} /> Browse Courses</Link>
      </div>
    </main>
  )
}

export default NotFound
