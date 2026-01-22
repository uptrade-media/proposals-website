/**
 * Customers Module Wrapper
 * 
 * Wrapper for embedding Customers module in MainLayout.
 */
import CustomersDashboard from '@/pages/customers/CustomersDashboard'

export default function CustomersModuleWrapper({ onNavigate }) {
  return <CustomersDashboard onNavigate={onNavigate} />
}
