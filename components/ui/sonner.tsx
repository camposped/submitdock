'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * shadcn-style sonner: neutral card surfaces driven by our theme variables
 * (white in light mode, popover-dark in dark mode) instead of sonner's tinted
 * richColors backgrounds. Colored icons keep the severity readable.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      closeButton
      offset={16}
      toastOptions={{
        className: 'text-sm',
        style: { borderRadius: '12px', boxShadow: '0 8px 30px rgb(0 0 0 / 0.10)' },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
