import { ProductMobilePicker, ProductNav } from './product-nav'

/**
 * The kit's shell: a fixed sub-rail on the left, sections scrolling in their
 * own column so the rail never moves with them.
 */
export default function ProductLayout({ children }: LayoutProps<'/product'>) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <ProductNav />
      <ProductMobilePicker />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )
}
