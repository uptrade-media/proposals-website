/**
 * CRM Business Lookup Function
 * 
 * Uses Google Places API + Signal CRM Skill to find business information
 * from a phone number after outbound calls
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { CRMSkill } from './skills/crm-skill.js'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

/**
 * Search Google Places by phone number
 */
async function searchByPhoneNumber(phoneNumber) {
  // Normalize phone number for search
  const normalized = phoneNumber.replace(/\D/g, '')
  const formatted = normalized.length === 10 
    ? `+1${normalized}` 
    : normalized.length === 11 && normalized.startsWith('1')
      ? `+${normalized}`
      : phoneNumber

  // Use Text Search to find business by phone
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(formatted)}&key=${GOOGLE_PLACES_API_KEY}`
  
  const response = await fetch(searchUrl)
  const data = await response.json()
  
  if (data.status !== 'OK' || !data.results?.length) {
    return null
  }
  
  return data.results[0]
}

/**
 * Get detailed place information
 */
async function getPlaceDetails(placeId) {
  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'url', // Google Maps URL
    'business_status',
    'opening_hours',
    'rating',
    'user_ratings_total',
    'types',
    'reviews'
  ].join(',')
  
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`
  
  const response = await fetch(detailsUrl)
  const data = await response.json()
  
  if (data.status !== 'OK' || !data.result) {
    return null
  }
  
  return data.result
}

/**
 * Search by business name + location (fallback)
 */
async function searchByBusinessName(name, location) {
  const query = location ? `${name} ${location}` : name
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
  
  const response = await fetch(searchUrl)
  const data = await response.json()
  
  if (data.status !== 'OK' || !data.results?.length) {
    return null
  }
  
  return data.results[0]
}

/**
 * Use CRM Skill to extract business context from call data
 */
async function extractBusinessContext(callData, supabase, orgId) {
  const crmSkill = new CRMSkill(supabase, orgId)
  return await crmSkill.extractBusinessContext(callData)
}

/**
 * Format business data for contact update
 */
function formatBusinessData(placeDetails, extractedContext) {
  return {
    business_name: placeDetails?.name || extractedContext?.business_name,
    company: placeDetails?.name || extractedContext?.business_name,
    website: placeDetails?.website || null,
    address: placeDetails?.formatted_address || null,
    google_maps_url: placeDetails?.url || null,
    google_place_id: placeDetails?.place_id || null,
    business_status: placeDetails?.business_status || null,
    rating: placeDetails?.rating || null,
    review_count: placeDetails?.user_ratings_total || null,
    business_type: placeDetails?.types?.[0] || extractedContext?.industry,
    opening_hours: placeDetails?.opening_hours?.weekday_text || null,
    // From AI extraction
    contact_name: extractedContext?.contact_name,
    contact_title: extractedContext?.contact_title,
    notes: extractedContext?.business_details
  }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { callLogId, phoneNumber, contactId } = JSON.parse(event.body || '{}')

    if (!callLogId && !phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'callLogId or phoneNumber required' })
      }
    }

    let callData = null
    let targetPhoneNumber = phoneNumber

    // Get call data if callLogId provided
    if (callLogId) {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callLogId)
        .single()

      if (error || !data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Call log not found' })
        }
      }

      callData = data
      targetPhoneNumber = data.phone_number
    }

    // Step 1: Try to find business by phone number
    let placeData = await searchByPhoneNumber(targetPhoneNumber)
    let placeDetails = null

    if (placeData?.place_id) {
      placeDetails = await getPlaceDetails(placeData.place_id)
    }

    // Step 2: If no result and we have call data, extract context with CRM Skill
    let extractedContext = null
    if (callData) {
      // Get org_id from call_log or contact
      const orgId = callData.org_id || 'uptrade'
      extractedContext = await extractBusinessContext(callData, supabase, orgId)
      
      // Step 3: If AI found a business name, try searching by name
      if (!placeDetails && extractedContext?.business_name && extractedContext.confidence > 0.5) {
        placeData = await searchByBusinessName(
          extractedContext.business_name,
          extractedContext.location
        )
        
        if (placeData?.place_id) {
          placeDetails = await getPlaceDetails(placeData.place_id)
        }
      }
    }

    // Format the combined data
    const businessData = formatBusinessData(placeDetails, extractedContext)

    // If we have a contact, update it with business data
    if (contactId && businessData.company) {
      await supabase
        .from('contacts')
        .update({
          company: businessData.company,
          website: businessData.website,
          notes: businessData.notes ? 
            `${businessData.notes}\n\nGoogle Rating: ${businessData.rating}/5 (${businessData.review_count} reviews)` 
            : null
        })
        .eq('id', contactId)
    }

    // If we have a call log, update it
    if (callLogId) {
      await supabase
        .from('call_logs')
        .update({
          ai_key_points: JSON.stringify({
            ...(callData?.ai_key_points ? JSON.parse(callData.ai_key_points) : {}),
            business_lookup: businessData
          })
        })
        .eq('id', callLogId)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        business: businessData,
        source: placeDetails ? 'google_places' : extractedContext ? 'ai_extraction' : 'not_found'
      })
    }

  } catch (error) {
    console.error('Business lookup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
