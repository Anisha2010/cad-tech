import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteAdminUser, fetchAdminUser, updateAdminUserStatus } from '../../services/adminUserService.js'
import './AdminUserManagement.css'

const titleFor = { student: 'Student', instructor: 'Instructor' }
const errorText = (error) => error.response?.data?.message || error.message || 'Unable to complete this request.'
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'Never'
const formatMoney = (value, currency = 'INR') => Number.isInteger(value) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value / 100) : '-'

function AdminUserDetail() {
  const { role, userId } = useParams()
  const navigate = useNavigate()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    fetchAdminUser(role, userId)
      .then((result) => { if (active) setDetails(result) })
      .catch((requestError) => { if (active) setError(errorText(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, userId, reload])

  const retry = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const updateStatus = async () => {
    const user = details?.user
    if (!user) return
    const nextStatus = user.accountStatus === 'blocked' ? 'active' : 'blocked'
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await updateAdminUserStatus(role, userId, nextStatus)
      setDetails((current) => ({ ...current, user: result.user }))
      setNotice(`Account ${nextStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`)
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setBusy(false)
    }
  }

  const removeUser = async () => {
    const user = details?.user
    if (!user) return
    const confirmed = window.confirm(`Delete this user permanently?\n\n${user.name} (${user.email}) will be soft-deleted and unable to sign in. Existing course, payment, enrollment, and submission records are retained to preserve their references.`)
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      await deleteAdminUser(role, userId)
      navigate(`/admin/${role}s`, { replace: true, state: { notice: `${user.name}'s account was removed. Related records have been retained.` } })
    } catch (requestError) {
      setError(errorText(requestError))
      setBusy(false)
    }
  }

  if (loading) return <main className="admin-page admin-user-page"><p className="admin-state" aria-live="polite">Loading account...</p></main>
  if (!details?.user) return <main className="admin-page admin-user-page"><div className="admin-user-feedback is-error" role="alert"><span>{error || 'Account not found.'}</span><button type="button" className="button button-outline" onClick={retry}>Retry</button></div><Link to={`/admin/${role}s`} className="button button-outline">Back to {titleFor[role]}s</Link></main>

  const { user } = details
  const title = titleFor[role] || 'User'

  return (
    <main className="admin-page admin-user-page">
      <header className="admin-page-header">
        <div><p className="admin-kicker">USERS / {title.toUpperCase()}</p><h1>{user.name}</h1><p>{user.email}</p></div>
        <Link to={`/admin/${role}s`} className="button button-outline">Back to {title}s</Link>
      </header>
      {error && <p className="admin-user-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-user-feedback" role="status">{notice}</p>}

      <section className="admin-user-profile-card">
        <div className="admin-user-detail-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.name?.trim().charAt(0)?.toUpperCase() || '?'}</span>}</div>
        <div className="admin-user-detail-info"><h2>{user.name}</h2><p>{user.email}</p><div className="admin-user-badges"><span className={`admin-user-badge ${user.emailVerified ? 'is-good' : 'is-muted'}`}>{user.emailVerified ? 'Verified email' : 'Not verified'}</span><span className={`admin-user-badge ${user.accountStatus === 'blocked' ? 'is-blocked' : 'is-good'}`}>{user.accountStatus === 'blocked' ? 'Blocked' : 'Active'}</span></div></div>
        <div className="admin-user-detail-actions"><button type="button" className="button button-secondary" onClick={updateStatus} disabled={busy}>{busy ? 'Saving...' : user.accountStatus === 'blocked' ? 'Unblock account' : 'Block account'}</button><button type="button" className="button button-danger" onClick={removeUser} disabled={busy}>Delete account</button></div>
      </section>

      <section className="admin-user-detail-grid">
        <article className="admin-user-detail-panel"><h2>Account information</h2><dl><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Email verification</dt><dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd></div><div><dt>Account status</dt><dd>{user.accountStatus === 'blocked' ? 'Blocked' : 'Active'}</dd></div><div><dt>Registered at</dt><dd>{formatDateTime(user.createdAt)}</dd></div><div><dt>Last login</dt><dd>{formatDateTime(user.lastLoginAt)}</dd></div></dl></article>

        {role === 'instructor' && <article className="admin-user-detail-panel"><h2>Course summary</h2><div className="admin-user-course-stats"><div><strong>{details.courseSummary?.total ?? 0}</strong><span>Courses</span></div><div><strong>{details.courseSummary?.published ?? 0}</strong><span>Published</span></div><div><strong>{details.courseSummary?.draft ?? 0}</strong><span>Drafts</span></div></div><p>Course records below reflect current instructor assignments or creator references.</p></article>}
      </section>

      {role === 'student' && <>
        <section className="admin-user-detail-panel admin-user-related-panel"><h2>Enrolled courses</h2>{details.enrollments?.length ? <div className="admin-user-related-table"><table className="admin-user-table"><thead><tr><th>Course</th><th>Status</th><th>Progress</th><th>Enrolled</th><th>Last accessed</th></tr></thead><tbody>{details.enrollments.map((item) => <tr key={item.id}><td>{item.course?.title || item.course?.slug || 'Unavailable course'}</td><td>{item.status}</td><td>{Number(item.progressPercentage || 0)}%</td><td>{formatDateTime(item.enrolledAt)}</td><td>{formatDateTime(item.lastAccessedAt)}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No enrollment records.</p>}</section>
        <section className="admin-user-detail-panel admin-user-related-panel"><h2>Payments</h2>{details.payments?.length ? <div className="admin-user-related-table"><table className="admin-user-table"><thead><tr><th>Course</th><th>Amount</th><th>Status</th><th>Created</th><th>Verified</th></tr></thead><tbody>{details.payments.map((item) => <tr key={item.id}><td>{item.course?.title || item.course?.slug || 'Unavailable course'}</td><td>{formatMoney(item.amountInPaise, item.currency)}</td><td>{item.status}</td><td>{formatDateTime(item.createdAt)}</td><td>{formatDateTime(item.verifiedAt)}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No payment records.</p>}</section>
      </>}

      {role === 'instructor' && <section className="admin-user-detail-panel admin-user-related-panel"><h2>Courses</h2>{details.courses?.length ? <div className="admin-user-related-table"><table className="admin-user-table"><thead><tr><th>Course</th><th>Relationship</th><th>Status</th><th>Review status</th><th>Created</th></tr></thead><tbody>{details.courses.map((course) => <tr key={course.id}><td>{course.title}</td><td>{course.relationship}</td><td>{course.status}</td><td>{course.reviewStatus || '-'}</td><td>{formatDateTime(course.createdAt)}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No associated course records.</p>}</section>}
    </main>
  )
}

export default AdminUserDetail
