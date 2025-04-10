"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"

/**
 * Helper function to revalidate multiple cache tags
 * @param tags - Array of cache tags to revalidate
 */
async function revalidateCacheTags(tags: string[]) {
  for (const tag of tags) {
    const cacheTag = await getCacheTag(tag)
    revalidateTag(cacheTag)
  }
}

export async function getCart(cartId?: string): Promise<HttpTypes.StoreCart | null> {
  if (!cartId) {
    cartId = await getCartId()
  }

  if (!cartId) {
    return null
  }

  const headers = await getAuthHeaders()
  const cacheOptions = await getCacheOptions("carts")

  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, {}, headers, cacheOptions)
    return cart
  } catch (error) {
    await removeCartId()
    return null
  }
}

export async function createCart(): Promise<HttpTypes.StoreCart> {
  const region = await getRegion()
  const headers = await getAuthHeaders()

  let cart: HttpTypes.StoreCart

  try {
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id },
      {},
      headers
    )

    cart = cartResp.cart

    await setCartId(cart.id)

    await revalidateCacheTags(["carts"])

    return cart
  } catch (e) {
    throw medusaError(e)
  }
}

export async function getOrCreateCart(): Promise<HttpTypes.StoreCart> {
  const region = await getRegion()
  const headers = await getAuthHeaders()

  let cart = await getCart()

  if (!cart) {
    cart = await createCart()
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    await revalidateCacheTags(["carts"])
  }

  return cart
}

export async function updateCart(data: Record<string, any>) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }) => {
      await revalidateCacheTags(["carts", "fulfillment"])
      return cart
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function addItem({
  variantId,
  quantity,
}: {
  variantId: string
  quantity: number
}) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .addLineItem(
      cartId,
      { variant_id: variantId, quantity },
      {},
      headers
    )
    .then(async () => {
      await revalidateCacheTags(["carts", "fulfillment"])
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function updateItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      await revalidateCacheTags(["carts", "fulfillment"])
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function removeItem(lineId: string) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .deleteLineItem(cartId, lineId, headers)
    .then(async () => {
      await revalidateCacheTags(["carts", "fulfillment"])
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function setShippingMethod(shippingMethodId: string) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      await revalidateCacheTags(["carts"])
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function setPaymentSession(providerId: string) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const cart = await getCart(cartId)

  if (!cart) {
    throw new Error("No cart found")
  }

  const headers = await getAuthHeaders()
  const data = { provider_id: providerId }

  return sdk.store.cart
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      await revalidateCacheTags(["carts"])
      return resp
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function applyDiscount(code: string) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()
  const codes = [code]

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      await revalidateCacheTags(["carts", "fulfillment"])
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function applyGiftCard(code: string) {
  // Function placeholder for future implementation
}

export async function removeDiscount(code: string) {
  // Function placeholder for future implementation
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
) {
  // Function placeholder for future implementation
}

export async function completeCart() {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cartId cookie found")
  }

  const headers = await getAuthHeaders()

  return sdk.store.cart
    .complete(cartId, {}, headers)
    .then(async (cartRes) => {
      await revalidateCacheTags(["carts"])
      
      if (cartRes.type === "order") {
        await removeCartId()
        await revalidateCacheTags(["orders"])
        redirect(`/order/confirmed/${cartRes.data.id}`)
      }

      return cartRes
    })
    .catch((err) => {
      throw medusaError(err)
    })
}

export async function setRegion(regionId: string) {
  const region = await getRegion(regionId)
  const cartId = await getCartId()

  if (cartId) {
    await updateCart({ region_id: region.id })
    await revalidateCacheTags(["carts"])
  }

  await revalidateCacheTags(["regions", "products"])
}
