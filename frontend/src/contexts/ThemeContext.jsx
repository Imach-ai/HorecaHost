import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// Available color schemes
export const COLOR_SCHEMES = {
  blue: {
    name: 'Blue',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    }
  },
  emerald: {
    name: 'Emerald',
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    }
  },
  purple: {
    name: 'Purple',
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    }
  },
  orange: {
    name: 'Orange',
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    }
  },
  rose: {
    name: 'Rose',
    primary: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
    }
  },
  indigo: {
    name: 'Indigo',
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    }
  }
}

// Available themes
export const THEMES = {
  light: 'light',
  dark: 'dark',
  auto: 'auto'
}

const defaultTheme = {
  mode: THEMES.light,
  colorScheme: 'blue',
  sidebarStyle: 'gradient', // 'gradient' or 'solid'
  borderRadius: 'medium', // 'small', 'medium', 'large'
  fontFamily: 'default', // 'default', 'modern', 'classic'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(defaultTheme)
  const [isLoading, setIsLoading] = useState(true)

  // Load theme from localStorage and backend on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // First try localStorage (fastest)
        const savedTheme = localStorage.getItem('app-theme')
        if (savedTheme) {
          const parsed = JSON.parse(savedTheme)
          setTheme({ ...defaultTheme, ...parsed })
        }

        // Then try to sync from backend (non-blocking)
        try {
          const { settingsApi } = await import('../api')
          const response = await settingsApi.getAll()
          if (response.data.theme) {
            const backendTheme = JSON.parse(response.data.theme)
            setTheme({ ...defaultTheme, ...backendTheme })
            localStorage.setItem('app-theme', JSON.stringify(backendTheme))
          }
        } catch (err) {
          console.warn('Could not load theme from backend:', err)
        }
      } catch (error) {
        console.error('Error loading theme:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTheme()
  }, [])

  // Apply theme to document - optimized to prevent lag
  useEffect(() => {
    if (isLoading) return

    const root = document.documentElement
    const colorScheme = COLOR_SCHEMES[theme.colorScheme] || COLOR_SCHEMES.blue
    
    const getEffectiveMode = () => {
      if (theme.mode === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme.mode
    }
    
    const mode = getEffectiveMode()

    // Apply color scheme immediately (no RAF needed for CSS vars)
    Object.entries(colorScheme.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value)
    })

    // Apply mode (use classList.toggle for better performance)
    root.classList.toggle('dark', mode === 'dark')
    root.classList.toggle('light', mode === 'light')

    // Apply border radius
    root.style.setProperty('--border-radius', 
      theme.borderRadius === 'small' ? '0.5rem' :
      theme.borderRadius === 'large' ? '1rem' : '0.75rem'
    )

    // Save to localStorage (synchronous, fast)
    localStorage.setItem('app-theme', JSON.stringify(theme))

    // Debounce backend sync to prevent lag during rapid changes
    const syncTimeout = setTimeout(() => {
      if (typeof window !== 'undefined') {
        import('../api').then(({ settingsApi }) => {
          settingsApi.update({ theme: JSON.stringify(theme) }).catch(err => {
            console.warn('Failed to sync theme to backend:', err)
          })
        })
      }
    }, 1000) // Wait 1 second after last change

    // Listen for system theme changes when in auto mode
    let mediaQuery = null
    let handleChange = null
    
    if (theme.mode === 'auto') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      handleChange = () => {
        const newMode = mediaQuery.matches ? 'dark' : 'light'
        root.classList.toggle('dark', newMode === 'dark')
        root.classList.toggle('light', newMode === 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
    }

    return () => {
      clearTimeout(syncTimeout)
      if (mediaQuery && handleChange) {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [theme, isLoading])

  const updateTheme = (updates) => {
    setTheme(prev => ({ ...prev, ...updates }))
  }

  const resetTheme = () => {
    setTheme(defaultTheme)
  }

  const value = {
    theme,
    updateTheme,
    resetTheme,
    isLoading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

