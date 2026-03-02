'use client'

import * as React from 'react'
import { useEffect, useState, createContext, useContext, useCallback } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: string
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>((defaultTheme as Theme) || 'dark')

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme === 'system' ? 'dark' : newTheme)
      try {
        localStorage.setItem('theme', newTheme)
      } catch {}
    }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored) {
        setThemeState(stored)
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(stored === 'system' ? 'dark' : stored)
      } else {
        document.documentElement.classList.add(defaultTheme)
      }
    } catch {
      document.documentElement.classList.add(defaultTheme)
    }
  }, [defaultTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme === 'system' ? 'dark' : theme }}>
      {children}
    </ThemeContext.Provider>
  )
}
