import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { deleteAdminUser, fetchAdminUsers, updateAdminUserStatus } from '../../services/adminUserService.js'
import './AdminUserManagement.css'

const roleLabels = { student: 'Students', instructor: 'Instructors' }
const errorText = (error) => error.response?.data?.message || error.message || 'Unable to complete this request.'
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Never'

function AdminUserManagement({ role }) {
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [verified, setVerified] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [busyUserId, setBusyUserId] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    fetchAdminUsers(role, { search, status, verified, page, limit: 20 })
      .then((result) => {
        if (!active) return
        setUsers(Array.isArray(result?.users) ? result.users : [])
        setPagination(result?.pagination || { page, limit: 20, totalItems: 0, totalPages: 0 })
      })
      .catch((requestError) => {
        if (active) setError(errorText(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [role, search, status, verified, page, reload])

  const beginLoad = () => {
    setLoading(true)
    setError('')
    setNotice('')
  }

  const submitSearch = (event) => {
    event.preventDefault()
    beginLoad()
    setPage(1)
    const nextSearch = searchInput.trim()
    if (nextSearch === search) setReload((value) => value + 1)
    else setSearch(nextSearch)
  }

  const changeFilter = (setter, value) => {
    beginLoad()
    setPage(1)
    setter(value)
  }

  const retry = () => {
    beginLoad()
    setReload((value) => value + 1)
  }

  const handleStatusChange = async (user) => {
    const nextStatus = user.accountStatus === 'blocked' ? 'active' : 'blocked'
    setBusyUserId(user.id)
    setError('')
    setNotice('')
    try {
      await updateAdminUserStatus(role, user.id, nextStatus)
      setNotice(`${user.name}'s account is now ${nextStatus === 'blocked' ? 'blocked' : 'active'}.`)
      if (status !== 'all' && status !== nextStatus) {
        setUsers((current) => current.filter((item) => item.id !== user.id))
        setPagination((current) => ({ ...current, totalItems: Math.max(0, current.totalItems - 1) }))
      } else {
        setUsers((current) => current.map((item) => item.id === user.id ? { ...item, accountStatus: nextStatus } : item))
      }
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setBusyUserId('')
    }
  }

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Delete this user permanently?\n\n${user.name} (${user.email}) will be soft-deleted and unable to sign in. Existing course, payment, enrollment, and submission records are retained to preserve their references.`)
    if (!confirmed) return
    setBusyUserId(user.id)
    setError('')
    setNotice('')
    try {
      await deleteAdminUser(role, user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setPagination((current) => ({ ...current, totalItems: Math.max(0, current.totalItems - 1) }))
      setNotice(`${user.name}'s account was removed. Related records have been retained.`)
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setBusyUserId('')
    }
  }

  const title = roleLabels[role]

  return (
    <main className="admin-page admin-user-page">
      <header className="admin-page-header">
        <div><p className="admin-kicker">USERS</p><h1>{title}</h1><p>Manage {role} account access and review account details.</p></div>
      </header>

      <section className="admin-user-toolbar" aria-label={`${title} filters`}>
        <form className="admin-user-search" onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor={`admin-${role}-search`}>Search by name or email</label>
          <input id={`admin-${role}-search`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" />
          <button type="submit" className="button button-secondary" disabled={loading}>Search</button>
        </form>
        <label>Account status<select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} disabled={loading}><option value="all">All statuses</option><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
        <label>Email verification<select value={verified} onChange={(event) => changeFilter(setVerified, event.target.value)} disabled={loading}><option value="all">All</option><option value="verified">Verified</option><option value="unverified">Not verified</option></select></label>
      </section>

      {error && <div className="admin-user-feedback is-error" role="alert"><span>{error}</span><button type="button" className="button button-outline" onClick={retry} disabled={loading}>Retry</button></div>}
      {notice && <p className="admin-user-feedback" role="status">{notice}</p>}
      <p className="admin-user-result-count">{loading ? 'Loading accounts...' : `${pagination.totalItems} ${role === 'student' ? 'students' : 'instructors'}`}</p>

      {loading ? <p className="admin-state" aria-live="polite">Loading {title.toLowerCase()}...</p> : users.length === 0 ? (
        <p className="admin-empty">No {title.toLowerCase()} match these filters.</p>
      ) : (
        <div className="admin-user-table-wrap">
          <table className="admin-user-table">
            <thead><tr><th>{role === 'student' ? 'Student' : 'Instructor'}</th><th>Email</th><th>Email verification</th><th>Status</th><th>Registered at</th><th>Last login</th><th>Actions</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id}>
              <td><div className="admin-user-identity">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{user.name?.trim().charAt(0)?.toUpperCase() || '?'}</span>}<strong>{user.name}</strong></div></td>
              <td>{user.email}</td>
              <td><span className={`admin-user-badge ${user.emailVerified ? 'is-good' : 'is-muted'}`}>{user.emailVerified ? 'Verified' : 'Not verified'}</span></td>
              <td><span className={`admin-user-badge ${user.accountStatus === 'blocked' ? 'is-blocked' : 'is-good'}`}>{user.accountStatus === 'blocked' ? 'Blocked' : 'Active'}</span></td>
              <td>{formatDate(user.createdAt)}</td>
              <td>{formatDate(user.lastLoginAt)}</td>
              <td><div className="admin-user-actions"><Link className="button button-outline" to={`/admin/${role}/${user.id}`}>View</Link><button type="button" className="button button-secondary" onClick={() => handleStatusChange(user)} disabled={busyUserId === user.id}>{busyUserId === user.id ? 'Saving...' : user.accountStatus === 'blocked' ? 'Unblock' : 'Block'}</button><button type="button" className="button button-danger" onClick={() => handleDelete(user)} disabled={busyUserId === user.id}>Delete</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && <nav className="admin-user-pagination" aria-label={`${title} pages`}><button type="button" className="button button-outline" onClick={() => { beginLoad(); setPage((value) => Math.max(1, value - 1)) }} disabled={page <= 1 || loading}>Previous</button><span>Page {pagination.page || page} of {pagination.totalPages}</span><button type="button" className="button button-outline" onClick={() => { beginLoad(); setPage((value) => Math.min(pagination.totalPages, value + 1)) }} disabled={page >= pagination.totalPages || loading}>Next</button></nav>}
    </main>
  )
}

export default AdminUserManagement
