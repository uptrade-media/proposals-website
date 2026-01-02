// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-chat-stream.js
// DEPRECATED: Redirect to echo-chat-public.js
// This file is kept for backward compatibility only
// 
// Architecture:
//   Signal = Knowledge layer (the brain)
//   Echo = Conversational interface (all chat endpoints)
//
// Use echo-chat-public.js for new integrations

// Re-export the handler from the new location
export { handler } from './echo-chat-public.js'
