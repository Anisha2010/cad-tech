import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle.jsx'
import './Navbar.css'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'CAD Models', path: '/cad-models' },
  { label: 'Services', path: '/services' },
  { label: 'Courses', path: '/courses' },
  { label: 'Contact', path: '/contact' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)
    const handleKeyDown = (event) => event.key === 'Escape' && setIsOpen(false)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleLogout = async () => {
    setLogoutError('')
    try { await logout(); setIsOpen(false); navigate('/login', { replace: true }) } catch { setLogoutError('Unable to log out. Please try again.') }
  }
  const dashboardPath = user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'

  return (
    <header className={`site-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="site-container navbar-inner">
        <NavLink className="brand" to="/" onClick={() => setIsOpen(false)} aria-label="CadTech Solution home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>CadTech <strong>Solution</strong></span>
        </NavLink>

        <nav className={`desktop-nav ${isOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />
          {isAuthenticated ? <div className="user-menu"><span className="user-name">{user.name}</span><NavLink className="button button-outline" to={dashboardPath}>Dashboard</NavLink><button className="button button-primary" type="button" onClick={handleLogout}>Logout</button></div> : <><NavLink className="button button-outline sign-in" to="/login">Sign In</NavLink><NavLink className="button button-primary get-started" to="/register">Get Started</NavLink></>}
        </div>

        <div className="mobile-controls">
          <ThemeToggle />
          <button className="menu-toggle" type="button" aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen} aria-controls="mobile-navigation" onClick={() => setIsOpen((open) => !open)}>
            {isOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
      <nav id="mobile-navigation" className={`mobile-nav ${isOpen ? 'is-open' : ''}`} aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
            {item.label}
          </NavLink>
        ))}
        <div className="mobile-actions">
          {isAuthenticated ? <><span className="user-name">{user.name}</span><NavLink className="button button-outline" to={dashboardPath} onClick={() => setIsOpen(false)}>Dashboard</NavLink><button className="button button-primary" type="button" onClick={handleLogout}>Logout</button></> : <><NavLink className="button button-outline" to="/login" onClick={() => setIsOpen(false)}>Sign In</NavLink><NavLink className="button button-primary" to="/register" onClick={() => setIsOpen(false)}>Get Started</NavLink></>}
        </div>
        {logoutError && <p className="navbar-error" role="alert">{logoutError}</p>}
      </nav>
    </header>
  )
}

export default Navbar