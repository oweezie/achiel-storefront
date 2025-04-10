import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

const LoadingSkeleton = () => {
  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <div className="animate-pulse bg-gray-100 h-40 rounded-lg"></div>
      <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
      <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
      <div className="animate-pulse bg-gray-100 h-24 rounded-lg"></div>
    </div>
  )
}

const EmptyCartMessage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
      <p className="text-gray-500 mb-6">Add items to your cart to proceed with checkout</p>
      <a href="/" className="bg-black text-white py-2 px-6 rounded-full">
        Continue shopping
      </a>
    </div>
  )
}

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  // Handle empty cart scenario with a user-friendly message
  if (!cart) {
    return <EmptyCartMessage />
  }

  // Check if cart has items
  if (!cart.items || cart.items.length === 0) {
    return <EmptyCartMessage />
  }

  try {
    const shippingMethods = await listCartShippingMethods(cart.id)
    const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

    if (!shippingMethods || !paymentMethods) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-500">
            Unable to load checkout information. Please try again later.
          </p>
        </div>
      )
    }

    return (
      <div className="w-full grid grid-cols-1 gap-y-8">
        <Addresses cart={cart} customer={customer} />

        <Shipping cart={cart} availableShippingMethods={shippingMethods} />

        <Payment cart={cart} availablePaymentMethods={paymentMethods} />

        <Review cart={cart} />
      </div>
    )
  } catch (error) {
    console.error("Error loading checkout data:", error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">
          An error occurred while loading checkout information. Please try again later.
        </p>
      </div>
    )
  }
}
