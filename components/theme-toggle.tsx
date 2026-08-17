'use client'

import { useLayoutEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Theme switching per Next 16's preventing-flash guide: an inline script in
 * the root layout sets `data-theme` on <html> before first paint, and this
 * toggle flips the attribute and persists the choice to localStorage. No
 * next-themes — its injected <script> is rejected by React in Next 16.
 */
const STORAGE_KEY = 'theme'

function preferredTheme(): string | null {
  // The stored choice only: light is the default and dark is always manual.
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function ThemeToggle() {
  // Dev-only repair: Strict Mode's remount resets <html> to its JSX
  // attributes, wiping what the pre-paint script set. No-op in production.
  useLayoutEffect(() => {
    const theme = preferredTheme()
    if (theme) document.documentElement.setAttribute('data-theme', theme)
  }, [])

  function toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground"
      onClick={toggle}
    >
      {/* CSS-swapped icons: the server doesn't know the theme, so rendering
         both and letting data-theme pick avoids a hydration mismatch. */}
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
