/**
 * @uptrade/site-kit/signal - SignalExperiment
 * 
 * A/B test component that renders different variants based on Signal assignment.
 * Uses Thompson Sampling (Bayesian bandit) for optimization.
 */

'use client'

import React, { useMemo, useEffect } from 'react'
import { useSignalExperiment, useSignalEvent } from './SignalBridge'

interface SignalExperimentProps {
  /** Unique experiment ID */
  experimentId: string
  
  /** Variants to test - keys are variant names, values are React nodes */
  variants: Record<string, React.ReactNode>
  
  /** Fallback content if no assignment (defaults to 'control' variant) */
  fallback?: React.ReactNode
  
  /** Track impression automatically */
  trackImpression?: boolean
  
  /** Children function for more control */
  children?: (props: { variant: string; isControl: boolean }) => React.ReactNode
}

/**
 * Renders different content variants based on Signal's A/B assignment.
 * 
 * @example
 * // Simple variant switching
 * <SignalExperiment experimentId="hero-cta" variants={{
 *   control: <Button>Get Started</Button>,
 *   variant_a: <Button variant="primary">Start Free Trial</Button>,
 *   variant_b: <Button variant="secondary">Book a Demo</Button>,
 * }} />
 * 
 * @example
 * // With render prop for more control
 * <SignalExperiment experimentId="pricing-layout">
 *   {({ variant, isControl }) => (
 *     <PricingSection layout={isControl ? 'cards' : 'table'} />
 *   )}
 * </SignalExperiment>
 */
export function SignalExperiment({
  experimentId,
  variants,
  fallback,
  trackImpression = true,
  children,
}: SignalExperimentProps) {
  const { assignment, variant, isControl } = useSignalExperiment(experimentId)
  const trackEvent = useSignalEvent()
  
  // Track impression when variant is rendered
  useEffect(() => {
    if (trackImpression && variant) {
      trackEvent({
        event_type: 'experiment',
        event_name: 'impression',
        event_data: {
          experiment_id: experimentId,
          variant_key: variant,
        },
      })
    }
  }, [experimentId, variant, trackImpression, trackEvent])
  
  // If using render prop
  if (children) {
    return <>{children({ variant: variant || 'control', isControl })}</>
  }
  
  // Determine what to render
  const selectedVariant = variant || 'control'
  const content = variants[selectedVariant]
  
  if (content !== undefined) {
    return <>{content}</>
  }
  
  // Fallback to provided fallback or control
  if (fallback) {
    return <>{fallback}</>
  }
  
  return <>{variants.control || null}</>
}

/**
 * Hook for conditional experiment logic
 * 
 * @example
 * const { variant, isControl } = useExperimentVariant('pricing-test')
 * 
 * return isControl 
 *   ? <OldPricing />
 *   : <NewPricing showAnnual={variant === 'annual_first'} />
 */
export function useExperimentVariant(experimentId: string) {
  return useSignalExperiment(experimentId)
}

/**
 * Component for tracking experiment conversions
 * Wraps interactive elements to track when they convert
 * 
 * @example
 * <SignalExperiment experimentId="signup-button" variants={{
 *   control: (
 *     <ExperimentConversion experimentId="signup-button" outcomeType="click">
 *       <Button>Sign Up</Button>
 *     </ExperimentConversion>
 *   ),
 *   variant_a: (
 *     <ExperimentConversion experimentId="signup-button" outcomeType="click">
 *       <Button variant="large">Join Now - It's Free!</Button>
 *     </ExperimentConversion>
 *   ),
 * }} />
 */
export function ExperimentConversion({
  experimentId,
  outcomeType = 'click',
  value,
  children,
}: {
  experimentId: string
  outcomeType?: string
  value?: number
  children: React.ReactElement
}) {
  const trackEvent = useSignalEvent()
  const { variant } = useSignalExperiment(experimentId)
  
  const handleInteraction = () => {
    trackEvent({
      event_type: 'experiment',
      event_name: 'conversion',
      event_data: {
        experiment_id: experimentId,
        variant_key: variant,
        outcome_type: outcomeType,
        value,
      },
    })
  }
  
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      handleInteraction()
      // Call original onClick if exists
      if (children.props.onClick) {
        children.props.onClick(e)
      }
    },
  })
}
