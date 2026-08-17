'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IdCard, Images, Palette } from 'lucide-react'

import { MobileRailPicker } from '@/components/mobile-rail-picker'
import { cn } from '@/lib/utils'

export const PRODUCT_SECTIONS = [
  // Branding leads because it is the section with something to look at, and the
  // one you are most often coming here to grab.
  { slug: 'branding', title: 'Branding', icon: Palette },
  { slug: 'screenshots', title: 'Screenshots', icon: Images },
  { slug: 'identity', title: 'Identity', icon: IdCard },
] as const

/** The kit's secondary rail, mirroring the boilerplate's settings one. */
export function ProductNav() {
  const pathname = usePathname()
  return (
    // px-3 and 232px match the main sidebar, so the two rails read as one
    // family and the pills sit the same distance from both edges.
    <nav className="hidden w-[232px] shrink-0 overflow-y-auto border-r p-3 md:block">
      <div className="flex flex-col gap-1">
        {PRODUCT_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/product/${section.slug}`}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
              pathname === `/product/${section.slug}` && 'bg-accent text-foreground',
            )}
          >
            <section.icon className="size-3.5 shrink-0 text-muted-foreground/90" />
            {section.title}
          </Link>
        ))}
      </div>
    </nav>
  )
}

/** The rail's mobile stand-in, since the rail itself is hidden below md. */
export function ProductMobilePicker() {
  const pathname = usePathname()
  return (
    <MobileRailPicker
      groups={[
        {
          label: null,
          items: PRODUCT_SECTIONS.map((section) => ({
            href: `/product/${section.slug}`,
            title: section.title,
            active: pathname === `/product/${section.slug}`,
            icon: section.icon,
          })),
        },
      ]}
    />
  )
}
