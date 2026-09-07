import { Moon, Sun } from 'lucide-react'
import useTheme from '../../../context/useTheme.jsx'
import './ThemeToggle.css'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const Icon = theme === 'light' ? Moon : Sun

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
      <Icon key={theme} size={19} aria-hidden="true" />
    </button>
  )
}

export default ThemeToggle