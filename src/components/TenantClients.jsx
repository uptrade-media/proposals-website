/**
 * TenantClients - Universal CRM for tenant organizations
 * 
 * Uses the simplified TenantCRMDashboard which:
 * - Has no OpenPhone integration
 * - Has no proposal-specific features
 * - Includes optional Signal AI toggle for smart insights
 * - Uses universal pipeline stages (Offer Made vs Proposal Sent)
 */

import { TenantCRMDashboard } from './tenant-crm'

export default function TenantClients() {
  return <TenantCRMDashboard />
}
