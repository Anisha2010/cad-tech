import './LogoutConfirmationDialog.css'

function LogoutConfirmationDialog({ open, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="logout-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title">
        <h2 id="logout-dialog-title">Are you sure you want to logout?</h2>
        <div className="logout-dialog-actions">
          <button type="button" className="button button-outline" onClick={onCancel}>Cancel</button>
          <button type="button" className="button button-primary" onClick={onConfirm}>Logout</button>
        </div>
      </section>
    </div>
  )
}

export default LogoutConfirmationDialog