import { CopyField } from '@/components/copy-field'
import { KitField } from '@/components/kit-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProduct } from '@/lib/actions'
import { activeProduct } from '@/lib/product-selection'
import { SOCIAL_NETWORKS, socialUrl } from '@/lib/social'

import { KitSection, NoProduct } from '../kit-section'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Social' }

export default async function SocialPage() {
  const product = await activeProduct()
  if (!product) return <NoProduct />

  const save = updateProduct.bind(null, product.slug)
  const filled = SOCIAL_NETWORKS.filter((n) => product[n.field])

  return (
    <KitSection
      title="Social"
      description="The profiles directory forms ask for. Paste a handle or a whole URL, either works."
    >
      <form action={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Profiles</CardTitle>
            <CardDescription>
              Stored as the handle, because that is the half you cannot work backwards to. The URL
              is built from it below, so a form asking for either is covered.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map((network) => (
              <KitField
                key={network.field}
                name={network.field}
                label={network.label}
                defaultValue={product[network.field]}
                hint={network.hint}
              />
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save profiles</Button>
        </div>
      </form>

      {filled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">As URLs</CardTitle>
            <CardDescription>
              What to paste when the form wants a link rather than a handle.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {filled.map((network) => (
              <div key={network.field} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{network.label}</span>
                <CopyField value={socialUrl(network, product[network.field])} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </KitSection>
  )
}
