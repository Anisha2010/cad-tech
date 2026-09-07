import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import './PasswordField.css'

function PasswordField({ id, label, value, onChange, onBlur, error, autoComplete, placeholder, inputRef }) {
  const [visible, setVisible] = useState(false)
  return <div className="password-field"><label htmlFor={id}>{label}<span aria-hidden="true"> *</span></label><div className="password-input-wrap"><input ref={inputRef} id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <span className="auth-field-error" id={`${id}-error`} role="alert">{error}</span>}</div>
}

export default PasswordField