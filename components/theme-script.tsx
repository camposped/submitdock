'use client'

/**
 * Sets `data-theme` on <html> during HTML parsing, before first paint, so a
 * dark-mode user never sees a light flash. Light is the default for everyone:
 * dark is a manual choice persisted in localStorage, never inferred from the
 * OS preference. Pattern from Next 16's
 * preventing-flash-before-hydration guide (and the reason there's no
 * next-themes here — React 19 rejects executable inline <script> elements):
 * the server render emits a real script that runs during parsing; on
 * hydration this re-renders as inert text/plain, which React accepts, and
 * suppressHydrationWarning covers the type mismatch.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);if(localStorage.getItem("hide-numbers")==="1")document.documentElement.setAttribute("data-hide-numbers","")}catch(e){}})()`

export function ThemeScript() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  )
}
