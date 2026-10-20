import { useEffect, useState } from 'react'

function readCollapsed(storageKey) {
  try {
    return window.localStorage.getItem(storageKey) === 'true'
  } catch {
    return false
  }
}

function useCollapsedSidebar(storageKey) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey))

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(collapsed))
    } catch {
      return
    }
  }, [collapsed, storageKey])

  const toggleCollapsed = () => setCollapsed((value) => !value)

  return [collapsed, toggleCollapsed]
}

export default useCollapsedSidebar
