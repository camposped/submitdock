import { LayoutDashboard, ListChecks, Package, ScrollText, Send, type LucideIcon } from 'lucide-react'

export type NavItem = {
  title: string
  href: '/' | '/submissions' | '/catalog' | '/agent-log' | '/product'
  icon: LucideIcon
  /** Announced but not built: a muted, unclickable row carrying a "Soon" chip. */
  soon?: true
}

export type NavGroup = {
  /** Section label; null for the unlabeled top group. */
  label: string | null
  items: NavItem[]
}

/** One flat group: five screens does not need dividing into sections. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
      // What you already tried, then what you could try next.
      { title: 'Submissions', href: '/submissions', icon: Send },
      { title: 'Catalog', href: '/catalog', icon: ListChecks },
      { title: 'Agent Log', href: '/agent-log', icon: ScrollText },
      { title: 'Product Kit', href: '/product', icon: Package },
    ],
  },
]

/** Routable but not in the sidebar; breadcrumbs still resolve them. */
export const HIDDEN_NAV_ITEMS: NavItem[] = []

/** Resolves the second crumb inside the kit's sub-rail. */
const PRODUCT_SECTION_TITLES: Record<string, string> = {
  branding: 'Branding',
  screenshots: 'Screenshots',
  identity: 'Identity',
}

export type Crumb = { title: string; href?: string }

/**
 * Header breadcrumb trail for a pathname. A nav page is a single crumb; a
 * child of one gets its parent as a link and the section as the current page.
 */
export function crumbsFor(pathname: string, dynamicLabel?: string | null): Crumb[] {
  const items = [...NAV_GROUPS.flatMap((g) => g.items), ...HIDDEN_NAV_ITEMS].filter((i) => !i.soon)

  const exact = items.find((i) => i.href === pathname)
  if (exact) return [{ title: exact.title }]

  const parent = items
    .filter((i) => i.href !== '/' && pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (parent) {
    const segment = decodeURIComponent(pathname.slice(parent.href.length + 1).split('/')[0])
    return [
      { title: parent.title, href: parent.href },
      { title: dynamicLabel ?? PRODUCT_SECTION_TITLES[segment] ?? segment },
    ]
  }

  return [{ title: 'Dashboard' }]
}
