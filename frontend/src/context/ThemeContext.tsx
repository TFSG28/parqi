/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  readonly children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme | null

    if (savedTheme) {
      setTheme(savedTheme)
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches
      const systemTheme = prefersDark ? 'dark' : 'light'
      setTheme(systemTheme)

      if (systemTheme === 'dark') {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    mounted
  }), [theme, toggleTheme, mounted])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
