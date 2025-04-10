"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logger } from "@lib/util/logger"
import { getAuthHeaders, setAuthToken, removeAuthToken } from "@lib/auth"
import { getCacheOptions, getCacheTag } from "@lib/cache"
import { getCartId, removeCartId } from "@lib/cart"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch((error) => {
        logger.error("Failed to retrieve customer", { error: error.toString() })
        return null
      })
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    const { customer } = await sdk.store.customer.update(body, {}, headers)
    
    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)
    
    logger.info("Customer updated successfully", { customerId: customer.id })
    return customer
  } catch (error) {
    logger.error("Failed to update customer", { 
      error: error.toString(),
      customerData: JSON.stringify(body)
    })
    return medusaError(error)
  }
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    logger.info("Attempting to register new customer", { email: customerForm.email })
    
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )
    
    logger.info("Customer created successfully", { customerId: createdCustomer.id })

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    try {
      await transferCart()
      logger.info("Cart transferred successfully for new customer", { customerId: createdCustomer.id })
    } catch (cartError: any) {
      logger.error("Failed to transfer cart during signup", { 
        error: cartError.toString(),
        customerId: createdCustomer.id 
      })
      // Continue with signup even if cart transfer fails
    }

    return createdCustomer
  } catch (error: any) {
    logger.error("Customer signup failed", { error: error.toString(), email: customerForm.email })
    return error.toString()
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    logger.info("Customer login attempt", { email })
    
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
        logger.info("Customer login successful", { email })
      })
  } catch (error: any) {
    logger.error("Customer login failed", { error: error.toString(), email })
    return error.toString()
  }

  try {
    await transferCart()
    logger.info("Cart transferred successfully after login", { email })
  } catch (error: any) {
    logger.error("Failed to transfer cart during login", { error: error.toString(), email })
    return error.toString()
  }
}

export async function signout(countryCode: string) {
  try {
    await sdk.auth.logout()
    logger.info("Customer logged out successfully")

    await removeAuthToken()

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await removeCartId()

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    redirect(`/${countryCode}/account`)
  } catch (error: any) {
    logger.error("Error during customer signout", { error: error.toString() })
    // Still attempt to redirect even if there was an error
    redirect(`/${countryCode}/account`)
  }
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    logger.info("No cart to transfer - cart ID not found")
    return
  }

  try {
    const headers = await getAuthHeaders()

    logger.info("Attempting to transfer cart", { cartId })
    await sdk.store.cart.transferCart(cartId, {}, headers)
    logger.info("Cart transferred successfully", { cartId })

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  } catch (error: any) {
    logger.error("Failed to transfer cart", { 
      error: error.toString(), 
      cartId,
      details: error.response?.data || "No additional details"
    })
    throw error; // Re-throw to allow calling functions to handle this error
  }
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  logger.info("Adding new customer address", { 
    country: address.country_code,
    isDefaultBilling,
    isDefaultShipping
  })

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      logger.info("Customer address added successfully", { customerId: customer.id })
      return { success: true, error: null }
    })
    .catch((err) => {
      logger.error("Failed to add customer address", { 
        error: err.toString(),
        addressData: JSON.stringify(address)
      })
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<any> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  logger.info("Attempting to delete customer address", { addressId })

  return await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      logger.info("Customer address deleted successfully", { addressId })
      return { success: true, error: null }
    })
    .catch((err) => {
      logger.error("Failed to delete customer address", { 
        error: err.toString(),
        addressId
      })
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    logger.error("Failed to update customer address - missing address ID")
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  logger.info("Updating customer address", { addressId })

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      logger.info("Customer address updated successfully", { addressId })
      return { success: true, error: null }
    })
    .catch((err) => {
      logger.error("Failed to update customer address", { 
        error: err.toString(),
        addressId,
        addressData: JSON.stringify(address)
      })
      return { success: false, error: err.toString() }
    })
}

// Export the CheckoutForm component for backward compatibility
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment cart={cart} availablePaymentMethods={paymentMethods} />

      <Review cart={cart} />
    </div>
  )
}
