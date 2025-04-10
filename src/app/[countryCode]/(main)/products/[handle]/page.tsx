import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRegion } from "@lib/data/region"
import { getProduct } from "@lib/data/product"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductDetail from "@modules/products/templates/product-detail"
import { getProductByHandle } from "@lib/data/product"
import { Logger } from "@lib/util/logger"

type Props = {
  params: {
    countryCode: string
    handle: string
  }
}

/**
 * Generate static parameters for all product handles
 * This improves performance by pre-rendering product pages at build time
 */
export async function generateStaticParams() {
  try {
    const { response } = await listProducts({})
    
    if (!response || !response.products) {
      Logger.error("Failed to fetch products for static generation")
      return []
    }

    return response.products.map((product) => ({
      handle: product.handle,
    }))
  } catch (error) {
    Logger.error(`Error generating static params for products: ${error}`)
    return []
  }
}

/**
 * Generate metadata for SEO optimization
 * This creates dynamic titles, descriptions, and Open Graph data for each product
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = params
  
  try {
    const product = await getProductByHandle(handle)
    
    if (!product) {
      return {
        title: "Product Not Found",
        description: "The product you are looking for could not be found.",
        robots: "noindex, nofollow",
      }
    }
    
    // Create a clean description by removing HTML tags and limiting length
    const cleanDescription = product.description
      ? product.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 160)
      : "Explore our product collection"
    
    return {
      title: `${product.title} | Racheal's Store`,
      description: cleanDescription,
      openGraph: {
        title: product.title,
        description: cleanDescription,
        images: product.thumbnail 
          ? [{ url: product.thumbnail, alt: product.title }] 
          : [],
        type: "product",
      },
      twitter: {
        card: "summary_large_image",
        title: product.title,
        description: cleanDescription,
        images: product.thumbnail ? [product.thumbnail] : [],
      },
    }
  } catch (error) {
    Logger.error(`Error generating metadata for product ${handle}: ${error}`)
    return {
      title: "Product | Racheal's Store",
      description: "Explore our product collection",
    }
  }
}

export default async function ProductPage({ params }: Props) {
  const { countryCode, handle } = params
  
  try {
    // Get region from country code
    const region = await getRegion(countryCode)
    
    if (!region) {
      Logger.error(`Region not found for country code: ${countryCode}`)
      notFound()
    }
    
    // Get product by handle
    const product = await getProductByHandle(handle)
    
    if (!product) {
      Logger.error(`Product not found with handle: ${handle}`)
      notFound()
    }
    
    return (
      <ProductDetail product={product} region={region} />
    )
  } catch (error) {
    Logger.error(`Error rendering product page for ${handle}: ${error}`)
    notFound()
  }
}
