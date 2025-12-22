// src/services/square.js
// Square API service wrapper for backend Netlify Functions

/**
 * Square Payment Service
 * Provides helper functions for Square Payments API integration
 * Using Square SDK v43+ (SquareClient API)
 * 
 * Environment Variables Required:
 * - SQUARE_ACCESS_TOKEN: Your Square access token
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 * - SQUARE_LOCATION_ID: Your Square location ID (optional, can be fetched)
 */

import { SquareClient, SquareEnvironment } from 'square'

/**
 * Initialize Square client with environment configuration
 * Uses Square SDK v43+ SquareClient
 */
export function getSquareClient() {
  const token = process.env.SQUARE_ACCESS_TOKEN
  const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox

  if (!token) {
    throw new Error('SQUARE_ACCESS_TOKEN environment variable is required')
  }

  return new SquareClient({
    token,
    environment
  })
}

/**
 * Get Square location ID
 * Fetches the first active location if SQUARE_LOCATION_ID is not set
 * Uses Square SDK v43+ API
 */
export async function getLocationId(client) {
  // Use environment variable if set
  if (process.env.SQUARE_LOCATION_ID) {
    return process.env.SQUARE_LOCATION_ID
  }

  // Otherwise fetch the first active location
  try {
    const response = await client.locations.list()
    
    if (!response.locations || response.locations.length === 0) {
      throw new Error('No Square locations found')
    }

    return response.locations[0].id
  } catch (error) {
    console.error('Error fetching Square location:', error)
    throw new Error('Failed to get Square location ID')
  }
}

/**
 * Create a Square payment
 * 
 * @param {Object} client - Square client instance
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.sourceId - Payment source token from frontend
 * @param {number} paymentData.amount - Amount in cents
 * @param {string} paymentData.currency - Currency code (default: USD)
 * @param {string} paymentData.idempotencyKey - Unique key to prevent duplicate charges
 * @param {string} paymentData.customerId - Square customer ID (optional)
 * @param {string} paymentData.locationId - Square location ID
 * @param {Object} paymentData.metadata - Additional metadata (optional)
 * 
 * @returns {Promise<Object>} Payment result
 */
export async function createPayment(client, paymentData) {
  const {
    sourceId,
    amount,
    currency = 'USD',
    idempotencyKey,
    customerId,
    locationId,
    metadata = {}
  } = paymentData

  if (!sourceId) {
    throw new Error('Payment source ID is required')
  }

  if (!amount || amount <= 0) {
    throw new Error('Valid payment amount is required')
  }

  if (!idempotencyKey) {
    throw new Error('Idempotency key is required')
  }

  if (!locationId) {
    throw new Error('Location ID is required')
  }

  try {
    // Square SDK v43+ uses client.payments.create()
    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      locationId,
      amountMoney: {
        amount: BigInt(amount),
        currency
      },
      customerId,
      note: metadata.note,
      referenceId: metadata.referenceId,
      // Autocomplete the payment immediately
      autocomplete: true
    })

    return {
      success: true,
      payment: response.payment,
      paymentId: response.payment.id,
      status: response.payment.status,
      receiptUrl: response.payment.receiptUrl
    }
  } catch (error) {
    console.error('Square payment error:', error)
    
    // Extract error details
    const errorDetails = error.errors?.[0] || {}
    
    return {
      success: false,
      error: errorDetails.detail || error.message || 'Payment failed',
      code: errorDetails.code,
      category: errorDetails.category
    }
  }
}

/**
 * Get payment details
 * 
 * @param {Object} client - Square client instance
 * @param {string} paymentId - Square payment ID
 * @returns {Promise<Object>} Payment details
 */
export async function getPayment(client, paymentId) {
  try {
    // Square SDK v43+ uses client.payments.get()
    const response = await client.payments.get({ paymentId })
    return {
      success: true,
      payment: response.payment
    }
  } catch (error) {
    console.error('Error fetching payment:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch payment'
    }
  }
}

/**
 * Create or retrieve Square customer
 * 
 * @param {Object} client - Square client instance
 * @param {Object} customerData - Customer details
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.givenName - First name
 * @param {string} customerData.familyName - Last name
 * @param {string} customerData.referenceId - External reference ID (optional)
 * 
 * @returns {Promise<Object>} Customer result
 */
export async function createCustomer(client, customerData) {
  const {
    email,
    givenName,
    familyName,
    referenceId
  } = customerData

  try {
    // First, search for existing customer by email
    // Square SDK v43+ uses client.customers.search()
    const searchResponse = await client.customers.search({
      query: {
        filter: {
          emailAddress: {
            exact: email
          }
        }
      }
    })

    // If customer exists, return existing customer
    if (searchResponse.customers && searchResponse.customers.length > 0) {
      return {
        success: true,
        customer: searchResponse.customers[0],
        customerId: searchResponse.customers[0].id,
        isNew: false
      }
    }

    // Create new customer
    // Square SDK v43+ uses client.customers.create()
    const createResponse = await client.customers.create({
      emailAddress: email,
      givenName,
      familyName,
      referenceId,
      idempotencyKey: `customer_${email}_${Date.now()}`
    })

    return {
      success: true,
      customer: createResponse.customer,
      customerId: createResponse.customer.id,
      isNew: true
    }
  } catch (error) {
    console.error('Error creating/fetching customer:', error)
    return {
      success: false,
      error: error.message || 'Failed to create customer'
    }
  }
}

/**
 * Generate idempotency key for Square API calls
 * Ensures uniqueness for payment operations
 * 
 * @param {string} prefix - Prefix for the key (e.g., 'payment', 'invoice')
 * @param {string} identifier - Unique identifier (e.g., invoice ID)
 * @returns {string} Idempotency key
 */
export function generateIdempotencyKey(prefix, identifier) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}_${identifier}_${timestamp}_${random}`
}

/**
 * Format amount for Square API (convert dollars to cents)
 * 
 * @param {number} dollars - Amount in dollars
 * @returns {number} Amount in cents
 */
export function dollarsToCents(dollars) {
  return Math.round(dollars * 100)
}

/**
 * Format amount from Square API (convert cents to dollars)
 * 
 * @param {BigInt|number} cents - Amount in cents
 * @returns {number} Amount in dollars
 */
export function centsToDollars(cents) {
  return Number(cents) / 100
}

export default {
  getSquareClient,
  getLocationId,
  createPayment,
  getPayment,
  createCustomer,
  generateIdempotencyKey,
  dollarsToCents,
  centsToDollars
}
