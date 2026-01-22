/**
 * Toast hook for shadcn/ui compatibility
 * Re-exports the toast utility from @/lib/toast
 * 
 * This provides compatibility with shadcn/ui components that expect useToast hook
 */

import { toast } from '@/lib/toast'

export const useToast = () => {
  return { toast }
}
