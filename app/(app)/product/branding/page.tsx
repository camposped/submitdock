import { BrandFields } from '@/components/product-assets'
import { activeProduct } from '@/lib/product-selection'

import { KitSection, NoProduct } from '../kit-section'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Branding' }

export default async function BrandingPage() {
  const product = await activeProduct()
  if (!product) return <NoProduct />

  return (
    <KitSection
      title="Branding"
      description="Four files, because forms ask for four. Each preview sits on the background its file is meant for, so a white logo in the light slot looks as wrong as it is."
    >
      <BrandFields
        slug={product.slug}
        values={{
          logoOnLight: product.logoOnLight,
          logoOnDark: product.logoOnDark,
          iconOnLight: product.iconOnLight,
          iconOnDark: product.iconOnDark,
        }}
      />
      <p className="text-xs text-muted-foreground">
        Saved the moment you pick a file. Copy path pastes into the upload dialog after
        Cmd+Shift+G.
      </p>
    </KitSection>
  )
}
