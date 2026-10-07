import { Award, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { verifyPublicCertificate } from '../../../services/certificateService.js'

function PublicCertificateVerification() {
  const { verificationCode } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadResult = async () => {
      setLoading(true)
      try {
        const response = await verifyPublicCertificate(verificationCode)
        setResult(response)
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to verify this certificate.')
      } finally {
        setLoading(false)
      }
    }

    if (verificationCode) loadResult()
  }, [verificationCode])

  return (
    <main className="student-content-area" style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <section className="student-panel">
        <div className="panel-header">
          <h3>Certificate Verification</h3>
          <Award size={20} />
        </div>

        {loading && <div className="dashboard-skeleton" role="status">Verifying certificate...</div>}
        {error && <div className="dashboard-error" role="alert"><strong>{error}</strong></div>}

        {!loading && result && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {result.valid ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={26} color="#16a34a" />
                  <strong>Valid certificate</strong>
                </div>
                <p><strong>Student:</strong> {result.studentName}</p>
                <p><strong>Course:</strong> {result.courseTitle}</p>
                <p><strong>Certificate Number:</strong> {result.certificateNumber}</p>
                <p><strong>Issued:</strong> {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString() : 'N/A'}</p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldAlert size={26} color="#dc2626" />
                  <strong>{result.status === 'revoked' ? 'This certificate has been revoked.' : 'Certificate not found or invalid.'}</strong>
                </div>
                <p><strong>Certificate Number:</strong> {result.certificateNumber || 'N/A'}</p>
                <p><strong>Course:</strong> {result.courseTitle || 'N/A'}</p>
              </>
            )}

            <Link className="button button-primary" to="/">Return home</Link>
          </div>
        )}
      </section>
    </main>
  )
}

export default PublicCertificateVerification
