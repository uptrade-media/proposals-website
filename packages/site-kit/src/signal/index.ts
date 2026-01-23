/**
 * @uptrade/site-kit/signal - Signal AI Integration
 * 
 * Enable autonomous optimization, A/B testing, and real-time configuration
 * updates powered by Signal AI.
 */

'use client'

// Main provider and hooks
export { 
  SignalBridge, 
  useSignal,
  useSignalConfig,
  useSignalEvent,
  useSignalOutcome,
  useSignalExperiment,
} from './SignalBridge'

// A/B testing components
export {
  SignalExperiment,
  useExperimentVariant,
  ExperimentConversion,
} from './SignalExperiment'

// Types
export * from './types'
