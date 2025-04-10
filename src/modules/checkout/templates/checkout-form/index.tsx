import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  let cart;
  let customer;
  let fetchError = false;
  
  try {
    cart = await retrieveCart()
    
    if (!cart) {
      return notFound()
    }
    
    customer = await retrieveCustomer()
  } catch (error) {
    console.error("Failed to load checkout data:", error)
    fetchError = true
  }
  
  if (fetchError) {
    return (
      <div className="content-container flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 p-6 rounded-lg flex flex-col items-center text-center max-w-md">
          <AlertTriangle className="text-red-500 mb-2" size={24} />
          <h2 className="text-lg font-medium text-red-700 mb-2">Unable to load checkout</h2>
          <p className="text-red-600 mb-4">We encountered an issue loading your checkout information. Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Refresh page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
