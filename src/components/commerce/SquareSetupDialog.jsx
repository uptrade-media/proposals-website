/**
 * SquareSetupDialog - Configure Square payment processor via OAuth
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { portalApi } from '@/lib/portal-api'
import { toast } from 'sonner'

export default function SquareSetupDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  const handleConnect = async () => {
    setError(null)
    setIsConnecting(true)
    
    try {
      // Redirect to Square OAuth flow
      window.location.href = `${portalApi.defaults.baseURL}/commerce/oauth/square/authorize/${projectId}`
    } catch (error) {
      console.error('Failed to initiate Square OAuth:', error)
      setError(error.response?.data?.message || 'Failed to connect Square')
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Square</DialogTitle>
          <DialogDescription>
            Connect your Square account to accept payments through Square.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Square to authorize this connection.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Process payments</li>
                <li>Read merchant profile</li>
                <li>Read and create items/products</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect Square at any time from your project settings.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Square
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
