import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Detect system preference
const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      // 'light' | 'dark' | 'system'
      theme: 'system',
      
      // The actual applied theme based on preference
      resolvedTheme: getSystemTheme(),
      
      // Set theme preference
      setTheme: (theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
        set({ theme, resolvedTheme })
        applyTheme(resolvedTheme)
      },
      
      // Toggle between light and dark (skips system)
      toggleTheme: () => {
        const { resolvedTheme } = get()
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
        set({ theme: newTheme, resolvedTheme: newTheme })
        applyTheme(newTheme)
      },
      
      // Initialize theme on app load
      initTheme: () => {
        const { theme } = get()
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
        set({ resolvedTheme })
        applyTheme(resolvedTheme)
        
        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handleChange = (e) => {
            const { theme } = get()
            if (theme === 'system') {
              const newResolved = e.matches ? 'dark' : 'light'
              set({ resolvedTheme: newResolved })
              applyTheme(newResolved)
            }
          }
          
          // Modern browsers
          if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange)
          } else {
            // Legacy browsers
            mediaQuery.addListener(handleChange)
          }
        }
      }
    }),
    {
      name: 'theme-preference',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

// Apply theme to document
function applyTheme(theme) {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}

export default useThemeStore
