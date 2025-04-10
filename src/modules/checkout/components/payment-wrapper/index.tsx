"use client"

import { loadStripe } from "@stripe/stripe-js"
import React, { useEffect } from "react"
import StripeWrapper from "./stripe-wrapper"
import { HttpTypes } from "@medusajs/types"
import { isStripe } from "@lib/constants"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null
const isProduction = process.env.NODE_ENV === 'production'

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  useEffect(() => {
    if (!stripeKey && !isProduction) {
      console.warn('Stripe initialization failed; check NEXT_PUBLIC_STRIPE_KEY environment variable')
    }
  }, [])

  // Check if we need Stripe but it's not available
  const needsStripeButUnavailable = 
    isStripe(paymentSession?.provider_id) && 
    paymentSession && 
    !stripePromise

  if (needsStripeButUnavailable && !isProduction) {
    console.warn('Stripe is required for this payment method but Stripe failed to initialize')
  }

  if (
    isStripe(paymentSession?.provider_id) &&
    paymentSession &&
    stripePromise
  ) {
    return (
      <StripeWrapper
        paymentSession={paymentSession}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  // Provide a more informative fallback UI when Stripe is needed but unavailable
  if (needsStripeButUnavailable) {
    return (
      <div>
        <div className="bg-amber-50 p-4 rounded-md mb-4 border border-amber-200">
          <p className="text-amber-800 text-sm">
            Payment provider is temporarily unavailable. Please try again later or contact support.
          </p>
        </div>
        {children}
      </div>
    )
  }
  
  return <div>{children}</div>
}

export default PaymentWrapper
