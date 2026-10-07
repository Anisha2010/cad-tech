import './ComingSoon.css'

function ComingSoon({ title, description, requiredBackend }) {
  return (
    <main className="admin-unavailable-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">ADMINISTRATION</p>
          <h1>{title}</h1>
          <p>{description || `${title} records are not available in the current admin API.`}</p>
        </div>
      </header>
      <section className="admin-unavailable-panel" aria-labelledby="backend-support-heading">
        <h2 id="backend-support-heading">Backend support required</h2>
        <p>This page is intentionally read-only and does not create or simulate records.</p>
        <p>{requiredBackend}</p>
      </section>
    </main>
  )
}

export default ComingSoon