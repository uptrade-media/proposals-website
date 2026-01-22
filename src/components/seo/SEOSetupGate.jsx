/**
 * SEO Setup Gate
 * 
 * DEPRECATED: Projects ARE SEO sites now (projectId === projectId)
 * No separate setup is needed. This is a simple passthrough.
 * 
 * Signal module has its own wizard (SignalSetupWizard) for AI training.
 */

export default function SEOSetupGate({ children }) {
  // Projects are SEO sites - no gate needed
  return children
}
