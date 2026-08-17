import type { Metadata } from 'next'
import { Geist_Mono, Inter, Manrope } from 'next/font/google'

import { ThemeScript } from '@/components/theme-script'
import { PRODUCT } from '@/lib/product.config'

import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// Brand wordmark only, the UI stays on Inter.
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['700', '800'] })

export const metadata: Metadata = {
  title: { template: `%s | ${PRODUCT.name}`, default: PRODUCT.name },
  description: PRODUCT.description,
}

/**
 * Root shell is intentionally bare: fonts, theme and global CSS only. The
 * (app) group brings the sidebar chrome and its fixed-viewport scroll
 * architecture.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      {/* overflow-hidden: all scrolling is internal; without it the Reveal
          entrance translate briefly overflows the viewport and the body
          "catches" scroll it should never have. */}
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  )
}
