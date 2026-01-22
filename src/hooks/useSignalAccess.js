// src/hooks/useSignalAccess.js
// Re-export signal access hook for easier importing
// The actual implementation is in @/lib/signal-access

export { 
  useSignalAccess, 
  useSignalStatus,
  useSignalEnabledProjectIds,
  useEchoAccess,
  useSyncSignalAccess,
  useEchoConfig,
  hasSignalFeature,
  withSignalAccess 
} from '@/lib/signal-access'

// Convenience hook that matches the expected interface from sidebar
export function useSignalAccessSimple() {
  const { hasAccess, hasCurrentProjectSignal, hasOrgSignal, canUseEcho, canUseSyncSignal, scope } = useSignalAccess()
  
  return {
    hasSignalAccess: hasAccess,
    hasCurrentProjectSignal,
    hasOrgSignal,
    canUseEcho,
    canUseSyncSignal,
    scope
  }
}

// Import the actual hook for re-export
import { useSignalAccess } from '@/lib/signal-access'
