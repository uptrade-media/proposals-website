/**
 * Setup Wizard Exports
 * 
 * The Setup Wizard provides a plug-and-play experience for integrating
 * Site-Kit into any Next.js project.
 * 
 * Usage:
 * 
 * 1. CLI approach:
 *    npx @uptrade/site-kit init
 * 
 * 2. Visual wizard (add to layout temporarily):
 *    import { UptradeSetup } from '@uptrade/site-kit/setup'
 *    <UptradeSetup />
 * 
 * 3. Manual API route setup:
 *    Copy the api-handlers.ts to your app/_uptrade/api/ folder
 */

export { SetupWizard, SetupWizard as UptradeSetup } from './SetupWizard'
export { handleRequest } from './api-handlers'
export { 
  generateIntegrationCode, 
  getSnippetsByModule,
} from './integration-generator'
export { IntegrationCodeView } from './IntegrationCodeView'
export type { IntegrationSnippet, GeneratorContext } from './integration-generator'
export type { IntegrationCodeViewProps } from './IntegrationCodeView'
