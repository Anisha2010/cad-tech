import { useEffect, useState } from 'react'
import { fetchAdminRecords } from '../../services/adminRecordService.js'
import './AdminRecords.css'

const pageConfig = {
  enrollments: {
    title: 'Enrollments',
    description: 'Review student course access, progress, and enrollment activity.',
    statuses: ['active', 'completed', 'cancelled']
  },
  payments: {
    title: 'Payments',
    description: 'Review payment status, transaction references, and course purchases.',
    statuses: ['creating', 'created', 'pending', 'paid', 'failed', 'refunded']
  }
}

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'
const formatCurrency = (amountInPaise, currency) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: currency || 'INR'
}).format(Number(amountInPaise || 0) / 100)

function AdminRecords({ type }) {
  const config = pageConfig[type]
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    fetchAdminRecords(type, { status, page, limit: 20 })
      .then((result) => {
        if (!active) return
        setRecords(Array.isArray(result.records) ? result.records : [])
        setPagination(result.pagination || { page, limit: 20, totalItems: 0, totalPages: 0 })
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || `Unable to load ${config.title.toLowerCase()}.`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [type, status, page, reload, config.title])

  const loadAgain = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const changeStatus = (value) => {
    setStatus(value)
    setPage(1)
    setLoading(true)
    setError('')
  }

  if (!config) return null

  return (
    <main className="admin-page admin-records-page">
      <header className="admin-page-header">
        <div><p className="admin-kicker">ADMINISTRATION</p><h1>{config.title}</h1><p>{config.description}</p></div>
      </header>

      <section className="admin-records-toolbar" aria-label={`${config.title} filters`}>
        <label htmlFor={`admin-${type}-status`}>Status
          <select id={`admin-${type}-status`} value={status} onChange={(event) => changeStatus(event.target.value)} disabled={loading}>
            <option value="all">All statuses</option>
            {config.statuses.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
          </select>
        </label>
        <p aria-live="polite">{loading ? 'Loading records...' : `${pagination.totalItems} ${config.title.toLowerCase()}`}</p>
      </section>

      {error && <div className="admin-records-feedback is-error" role="alert"><span>{error}</span><button type="button" className="button button-outline" onClick={loadAgain} disabled={loading}>Retry</button></div>}

      {loading ? <p className="admin-state" aria-live="polite">Loading {config.title.toLowerCase()}...</p> : records.length === 0 ? (
        <p className="admin-empty">No {config.title.toLowerCase()} match this status.</p>
      ) : (
        <div className="admin-records-table-wrap">
          {type === 'enrollments' ? <EnrollmentTable records={records} /> : <PaymentTable records={records} />}
        </div>
      )}

      {pagination.totalPages > 1 && <nav className="admin-records-pagination" aria-label={`${config.title} pages`}>
        <button type="button" className="button button-outline" onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)) }} disabled={page <= 1 || loading}>Previous</button>
        <span>Page {pagination.page || page} of {pagination.totalPages}</span>
        <button type="button" className="button button-outline" onClick={() => { setLoading(true); setPage((value) => Math.min(pagination.totalPages, value + 1)) }} disabled={page >= pagination.totalPages || loading}>Next</button>
      </nav>}
    </main>
  )
}

function StudentCell({ student }) {
  return <div className="admin-records-student"><strong>{student?.name || 'Unavailable account'}</strong><span>{student?.email || '—'}</span></div>
}

function CourseCell({ course }) {
  return <div className="admin-records-course"><strong>{course?.title || 'Unavailable course'}</strong><span>{course?.slug || '—'}</span></div>
}

function StatusBadge({ status }) {
  return <span className={`admin-records-status is-${status}`}>{status || 'unknown'}</span>
}

function EnrollmentTable({ records }) {
  return <table className="admin-records-table">
    <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Progress</th><th>Enrolled</th><th>Last accessed</th></tr></thead>
    <tbody>{records.map((record) => <tr key={record.id}>
      <td><StudentCell student={record.student} /></td><td><CourseCell course={record.course} /></td>
      <td><StatusBadge status={record.status} /></td><td>{Math.round(Number(record.progressPercentage || 0))}%</td>
      <td>{formatDate(record.enrolledAt)}</td><td>{formatDate(record.lastAccessedAt)}</td>
    </tr>)}</tbody>
  </table>
}

function PaymentTable({ records }) {
  return <table className="admin-records-table is-payments">
    <thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th>Order reference</th><th>Payment reference</th><th>Created</th><th>Verified</th></tr></thead>
    <tbody>{records.map((record) => <tr key={record.id}>
      <td><StudentCell student={record.student} /></td><td><CourseCell course={record.course} /></td>
      <td>{formatCurrency(record.amountInPaise, record.currency)}</td><td><StatusBadge status={record.status} /></td>
      <td className="admin-records-reference">{record.providerOrderId || '—'}</td><td className="admin-records-reference">{record.providerPaymentId || '—'}</td>
      <td>{formatDate(record.createdAt)}</td><td>{formatDate(record.verifiedAt)}</td>
    </tr>)}</tbody>
  </table>
}

export default AdminRecords