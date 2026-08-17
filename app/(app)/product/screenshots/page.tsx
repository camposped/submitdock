import { ScreenshotGallery } from '@/components/product-assets'
import { parseJsonArray } from '@/lib/domain'
import { activeProduct } from '@/lib/product-selection'

import { KitSection, NoProduct } from '../kit-section'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Screenshots' }

export default async function ScreenshotsPage() {
  const product = await activeProduct()
  if (!product) return <NoProduct />

  const screenshots = parseJsonArray(product.screenshots)

  return (
    <KitSection
      title="Screenshots"
      description="Directories usually take two or three, and the first one is the thumbnail. Hover a shot to reorder or remove it."
    >
      <ScreenshotGallery slug={product.slug} screenshots={screenshots} />
    </KitSection>
  )
}
