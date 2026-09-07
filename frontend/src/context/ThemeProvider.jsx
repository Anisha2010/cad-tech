import { useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext.jsx'

const validThemes = new Set(['light', 'dark'])

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem('cadtech-theme')
    if (validThemes.has(savedTheme)) return savedTheme
  } catch {
    // Fall back to the system preference when storage is unavailable.
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.bsTheme = theme
    try {
      window.localStorage.setItem('cadtech-theme', theme)
    } catch {
      // The theme still applies for the current session if storage is unavailable.
    }
  }, [theme])

  const setTheme = (nextTheme) => {
    if (validThemes.has(nextTheme)) setThemeState(nextTheme)
  }

  const toggleTheme = () => setThemeState((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export default ThemeProvider