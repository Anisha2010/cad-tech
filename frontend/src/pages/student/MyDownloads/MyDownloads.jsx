import { Download, FileText, FolderOpen, RefreshCw, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { fetchMyCadDownloads, requestCadDownload } from '../../../services/cadDownloadService.js'
import './MyDownloads.css'

function MyDownloads() {
  const [downloads, setDownloads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadDownloads = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchMyCadDownloads()
      const items = Array.isArray(response?.data?.entitlements) ? response.data.entitlements : []
      setDownloads(items)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your CAD downloads.')
      setDownloads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDownloads()
  }, [])

  const handleDownload = async (item) => {
    if (!item?.productId || downloadingId) return

    setDownloadingId(item.entitlementId || item.id)
    setError('')

    try {
      const response = await requestCadDownload(item.productId)
      const payload = response?.data || {}
      const url = payload.downloadUrl || payload.url || null
      const fileName = payload.fileName || item.title || 'cad-download'

      if (!url) throw new Error('Download is not available right now.')

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to prepare your secure download.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="student-content-area my-downloads-page">
          <header className="my-downloads-header">
            <div>
              <p className="welcome-kicker">Downloads</p>
              <h2>My Downloads</h2>
              <p className="welcome-description">Access CAD products you have purchased or claimed.</p>
            </div>
            <Link className="button button-outline" to="/cad-models"><FolderOpen size={16} /> Browse CAD Models</Link>
          </header>

          {loading && <div className="dashboard-skeleton" role="status" aria-live="polite">Loading your downloads...</div>}

          {!loading && error && (
            <div className="dashboard-error" role="alert">
              <div>
                <strong>{error}</strong>
                <p>Please try again in a moment.</p>
              </div>
              <button type="button" className="button button-outline" onClick={loadDownloads}><RefreshCw size={16} /> Try Again</button>
            </div>
          )}

          {!loading && !error && downloads.length === 0 && (
            <section className="empty-state-panel" aria-live="polite">
              <FileText size={28} aria-hidden="true" />
              <h3>No CAD downloads yet</h3>
              <p>CAD products you purchase or claim will appear here.</p>
              <Link className="button button-primary" to="/cad-models">Browse CAD Models</Link>
            </section>
          )}

          {!loading && !error && downloads.length > 0 && (
            <section className="download-list" aria-label="CAD downloads">
              {downloads.map((item) => {
                const isBusy = downloadingId === (item.entitlementId || item.id)
                return (
                  <article className="download-card" key={item.entitlementId || item.id}>
                    <div className="download-thumb-wrap">
                      {item.thumbnail ? <img src={item.thumbnail} alt={item.title} onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <div className="download-thumb-fallback">CAD</div>}
                    </div>
                    <div className="download-card-body">
                      <div className="download-card-topline">
                        <span>{item.category || 'CAD Model'}</span>
                        <span>{item.fileFormat || 'Unknown Format'}</span>
                      </div>
                      <h3>{item.title || 'CAD Product'}</h3>
                      <div className="download-meta-grid">
                        <div><label>Software</label><strong>{Array.isArray(item.software) && item.software.length ? item.software.join(', ') : 'N/A'}</strong></div>
                        <div><label>File Size</label><strong>{item.fileSize ? `${(item.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Not available'}</strong></div>
                        <div><label>Access Date</label><strong>{item.grantedAt ? new Date(item.grantedAt).toLocaleDateString() : 'Recent'}</strong></div>
                        <div><label>Source</label><strong>{item.entitlementSource || 'purchase'}</strong></div>
                      </div>
                    </div>
                    <div className="download-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={isBusy}
                        onClick={() => handleDownload(item)}
                      >
                        {isBusy ? <><RefreshCw size={16} className="spin" /> Preparing Download...</> : <><Download size={16} /> Download File</>}
                      </button>
                      <Link className="button button-outline" to={`/model/${item.productSlug}`}>View Product</Link>
                    </div>
                  </article>
                )
              })}
            </section>
          )}

          {error && (
            <div className="student-alert" role="alert" aria-live="polite">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default MyDownloads
