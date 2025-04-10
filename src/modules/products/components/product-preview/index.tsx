import { Text } from "@medusajs/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // Get the cheapest price from all variants of the product
  // This utility analyzes all product variants and their prices
  // to determine the lowest available price to display in the preview
  const { cheapestPrice } = getProductPrice({
    product,
  })

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group"
    >
      <div className="relative aspect-[9/12]">
        <Thumbnail
          thumbnail={product.thumbnail}
          size="full"
          isFeatured={isFeatured}
        />
      </div>
      <div className="flex txt-compact-medium mt-4 justify-between">
        <Text className="text-ui-fg-subtle" data-testid="product-title">
          {product.title}
        </Text>
        <div className="flex items-center gap-x-2">
          {cheapestPrice ? (
            <PreviewPrice price={cheapestPrice} />
          ) : (
            <Text className="text-ui-fg-muted">Price not available</Text>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
