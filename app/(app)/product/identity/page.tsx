import { KitField } from '@/components/kit-field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProduct } from '@/lib/actions'
import { parseJsonArray } from '@/lib/domain'
import { activeProduct } from '@/lib/product-selection'

import { KitSection, NoProduct } from '../kit-section'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Identity' }

export default async function IdentityPage() {
  const product = await activeProduct()
  if (!product) return <NoProduct />

  const save = updateProduct.bind(null, product.slug)

  return (
    <KitSection
      title="Identity"
      description="The words every directory form asks for. Copy each answer straight in."
    >
      {!product.contactEmail && (
        <Alert>
          <AlertTitle>Contact email is still empty</AlertTitle>
          <AlertDescription>
            Create the Gmail you want directory signups and confirmations to land in, then paste it
            below. Phase 2 reads that inbox over the Gmail MCP.
          </AlertDescription>
        </Alert>
      )}

      <form action={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">The basics</CardTitle>
            <CardDescription>Who the product is, in the fields forms ask for.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <KitField name="name" label="Name" defaultValue={product.name} />
            <KitField name="tagline" label="Tagline" defaultValue={product.tagline} limit={60} />
            <KitField name="url" label="URL" defaultValue={product.url} />
            <KitField
              name="contactEmail"
              label="Contact email"
              defaultValue={product.contactEmail}
              hint="receives confirmations"
            />
            <KitField
              name="categories"
              label="Categories"
              defaultValue={parseJsonArray(product.categories).join(', ')}
              hint="comma separated"
            />
            <KitField name="pricing" label="Pricing" defaultValue={product.pricing} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Descriptions</CardTitle>
            <CardDescription>
              Three lengths, because directories ask for three. The counter turns red past the
              length most of them accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <KitField
              name="descriptionShort"
              label="Short"
              defaultValue={product.descriptionShort}
              limit={60}
              multiline
              rows={2}
            />
            <KitField
              name="descriptionMedium"
              label="Medium"
              defaultValue={product.descriptionMedium}
              limit={160}
              multiline
              rows={3}
            />
            <KitField
              name="descriptionLong"
              label="Long"
              defaultValue={product.descriptionLong}
              limit={500}
              multiline
              rows={8}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save identity</Button>
        </div>
      </form>
    </KitSection>
  )
}
