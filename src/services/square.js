// src/services/square.js
// Square API service wrapper for backend Netlify Functions

/**
 * Square Payment Service
 * Provides helper functions for Square Payments API integration
 * 
 * Environment Variables Required:
 * - SQUARE_ACCESS_TOKEN: Your Square access token
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 * - SQUARE_LOCATION_ID: Your Square location ID (optional, can be fetched)
 */

import { Client, Environment } from 'square'

/**
 * Initialize Square client with environment configuration
 */
export function getSquareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox

  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN environment variable is required')
  }

  return new Client({
    accessToken,
    environment
  })
}

/**
 * Get Square location ID
 * Fetches the first active location if SQUARE_LOCATION_ID is not set
 */
export async function getLocationId(client) {
  // Use environment variable if set
  if (process.env.SQUARE_LOCATION_ID) {
    return process.env.SQUARE_LOCATION_ID
  }

  // Otherwise fetch the first active location
  try {
    const { result } = await client.locationsApi.listLocations()
    
    if (!result.locations || result.locations.length === 0) {
      throw new Error('No Square locations found')
    }

    return result.locations[0].id
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
    const { result } = await client.paymentsApi.createPayment({
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
      payment: result.payment,
      paymentId: result.payment.id,
      status: result.payment.status,
      receiptUrl: result.payment.receiptUrl
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
    const { result } = await client.paymentsApi.getPayment(paymentId)
    return {
      success: true,
      payment: result.payment
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
    const { result: searchResult } = await client.customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: {
            exact: email
          }
        }
      }
    })

    // If customer exists, return existing customer
    if (searchResult.customers && searchResult.customers.length > 0) {
      return {
        success: true,
        customer: searchResult.customers[0],
        customerId: searchResult.customers[0].id,
        isNew: false
      }
    }

    // Create new customer
    const { result: createResult } = await client.customersApi.createCustomer({
      emailAddress: email,
      givenName,
      familyName,
      referenceId,
      idempotencyKey: `customer_${email}_${Date.now()}`
    })

    return {
      success: true,
      customer: createResult.customer,
      customerId: createResult.customer.id,
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
