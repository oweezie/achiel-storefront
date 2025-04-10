import Medusa from "@medusajs/js-sdk"

// Validate essential environment variables
if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY environment variable in production')
}

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Missing MEDUSA_BACKEND_URL environment variable in production')
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})
