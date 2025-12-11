import { useEffect } from 'react'
import useThemeStore from '@/lib/theme-store'

export function ThemeProvider({ children }) {
  const initTheme = useThemeStore((state) => state.initTheme)
  
  // Initialize theme on mount
  useEffect(() => {
    initTheme()
  }, [initTheme])
  
  return children
}

// Theme toggle button component for convenience
export function ThemeToggle({ className = '' }) {
  const { resolvedTheme, toggleTheme, setTheme, theme } = useThemeStore()
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-full transition-all duration-200
        hover:bg-[var(--glass-bg-hover)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]
        ${className}
      `}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        // Sun icon for dark mode (click to go light)
        <svg 
          className="w-5 h-5 text-[var(--text-primary)]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      ) : (
        // Moon icon for light mode (click to go dark)
        <svg 
          className="w-5 h-5 text-[var(--text-primary)]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      )}
    </button>
  )
}

// Theme selector dropdown for settings pages
export function ThemeSelector({ className = '' }) {
  const { theme, setTheme } = useThemeStore()
  
  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]
  
  return (
    <div className={`flex gap-1 p-1 rounded-lg bg-[var(--glass-bg-inset)] ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
            ${theme === option.value 
              ? 'bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] shadow-sm' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default ThemeProvider
