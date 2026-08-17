import { redirect } from 'next/navigation'

/** The kit has no page of its own; the rail's first section is the landing. */
export default function ProductKitIndex() {
  redirect('/product/branding')
}
