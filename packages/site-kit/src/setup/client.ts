/**
 * Setup Wizard Client Exports
 * 
 * These are React components that run in the browser.
 * Import from '@uptrademedia/site-kit/setup/client' in client components.
 */

export { SetupWizard, SetupWizard as UptradeSetup } from './SetupWizard'
export { 
  generateIntegrationCode, 
  getSnippetsByModule,
} from './integration-generator'
export { IntegrationCodeView } from './IntegrationCodeView'
export type { IntegrationSnippet, GeneratorContext } from './integration-generator'
export type { IntegrationCodeViewProps } from './IntegrationCodeView'
