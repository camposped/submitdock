/**
 * The brand slots, named for the background the artwork goes ON rather than
 * for the colour of its ink.
 *
 * "Send us your light logo" is the most reliably misread sentence in this
 * whole job: half the world means light ink, the other half means the file for
 * a light page. Naming the slot after the destination removes the guess, and
 * the UI reinforces it by previewing each one on the background it is for.
 *
 * No server-only import here on purpose: the labels are needed on both sides,
 * and a 'use server' module may only export async functions.
 */
export const SINGLE_ASSET_FIELDS = ['logoOnLight', 'logoOnDark', 'iconOnLight', 'iconOnDark'] as const

export type SingleAssetField = (typeof SINGLE_ASSET_FIELDS)[number]
export type AssetField = SingleAssetField | 'screenshots'

export function isSingleAssetField(field: AssetField): field is SingleAssetField {
  return (SINGLE_ASSET_FIELDS as readonly string[]).includes(field)
}

export type BrandSlot = {
  field: SingleAssetField
  label: string
  hint: string
  /** Which surface the preview tile is painted on, so the choice is visible. */
  surface: 'light' | 'dark'
  shape: 'wide' | 'square'
}

export const BRAND_SLOTS: BrandSlot[] = [
  {
    field: 'logoOnLight',
    label: 'Logo on light',
    hint: 'Dark artwork, for a directory with a white page.',
    surface: 'light',
    shape: 'wide',
  },
  {
    field: 'logoOnDark',
    label: 'Logo on dark',
    hint: 'Light artwork, for a dark page or a dark card.',
    surface: 'dark',
    shape: 'wide',
  },
  {
    field: 'iconOnLight',
    label: 'Icon on light',
    hint: 'Square. Asked for as app icon, avatar or favicon.',
    surface: 'light',
    shape: 'square',
  },
  {
    field: 'iconOnDark',
    label: 'Icon on dark',
    hint: 'Square, for the same fields on a dark listing.',
    surface: 'dark',
    shape: 'square',
  },
]
