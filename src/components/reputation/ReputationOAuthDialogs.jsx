/**
 * ReputationOAuthDialogs - OAuth connection dialogs for review platforms
 * Styled to match Commerce module dialogs exactly
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ExternalLink, Key, Star, CheckCircle2 } from 'lucide-react'
import { reputationApi, getPortalApiUrl } from '@/lib/portal-api'
import { toast } from 'sonner'

// Platform configuration
const PLATFORM_CONFIG = {
  google: {
    name: 'Google Business Profile',
    color: '#4285f4',
    icon: '🔵',
    description: 'Connect your Google Business Profile to sync reviews automatically.',
    permissions: [
      'Access your business reviews',
      'Read review ratings and content',
      'Sync new reviews automatically',
    ],
    oauth: true,
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    icon: '🔷',
    description: 'Connect your Facebook Page to sync reviews and recommendations.',
    permissions: [
      'Access page reviews and recommendations',
      'Read review content',
      'Monitor new feedback',
    ],
    oauth: true,
  },
  trustpilot: {
    name: 'Trustpilot',
    color: '#00b67a',
    icon: '🟢',
    description: 'Connect your Trustpilot business account to sync reviews.',
    permissions: [
      'Access your business reviews',
      'Read ratings and feedback',
      'Sync verified reviews',
    ],
    oauth: true,
  },
  yelp: {
    name: 'Yelp',
    color: '#d32323',
    icon: '🔴',
    description: 'Connect your Yelp business listing using an API key.',
    permissions: [
      'Access public business reviews',
      'Read ratings and content',
      'Monitor review activity',
    ],
    oauth: false, // API key based
  },
}

// Google OAuth Dialog
export function GoogleOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [placeId, setPlaceId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const config = PLATFORM_CONFIG.google

  const handleConnect = async () => {
    if (!placeId.trim()) {
      setError('Please enter a Google Place ID')
      return
    }
    
    setError(null)
    setIsConnecting(true)
    
    try {
      // Connect using Place ID (uses Places API - no OAuth needed)
      const response = await reputationApi.connectPlatform(projectId, {
        platformType: 'google',
        externalPlaceId: placeId.trim(),
        platformName: businessName.trim() || 'Google Business Profile',
      })
      
      const result = response.data
      
      // Show appropriate success message based on sync result
      if (result.synced && result.newReviews > 0) {
        toast.success(`Google Business Profile connected! Synced ${result.newReviews} reviews.`)
      } else if (result.synced) {
        toast.success('Google Business Profile connected! No new reviews to sync.')
      } else if (result.syncError) {
        toast.warning(`Connected but sync failed: ${result.syncError}`)
      } else {
        toast.success('Google Business Profile connected!')
      }
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to connect Google:', error)
      setError(error.response?.data?.message || 'Failed to connect Google')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            Connect using your Google Place ID to sync reviews automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="placeId">Google Place ID *</Label>
              <Input
                id="placeId"
                placeholder="ChIJ..."
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Find your Place ID at{' '}
                <a 
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Google's Place ID Finder
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (optional)</Label>
              <Input
                id="businessName"
                placeholder="Your Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What we'll sync:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>All public reviews and ratings</li>
                <li>Review text and author info</li>
                <li>New reviews automatically</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-[var(--glass-border)]">
                Note: Responding to reviews requires full GBP API access (coming soon)
              </p>
            </div>
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
            disabled={isConnecting || !placeId.trim()}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Facebook OAuth Dialog
export function FacebookOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const config = PLATFORM_CONFIG.facebook

  const handleConnect = async () => {
    setError(null)
    setIsConnecting(true)
    
    try {
      // Redirect to Facebook OAuth flow
      const apiUrl = getPortalApiUrl()
      window.location.href = `${apiUrl}/reputation/oauth/facebook/authorize?project_id=${projectId}`
    } catch (error) {
      console.error('Failed to initiate Facebook OAuth:', error)
      setError(error.response?.data?.message || 'Failed to connect Facebook')
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
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
              You'll be redirected to Facebook to authorize this connection.
            </p>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect {config.name} at any time from the Platforms view.
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
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Trustpilot OAuth Dialog
export function TrustpilotOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const config = PLATFORM_CONFIG.trustpilot

  const handleConnect = async () => {
    setError(null)
    setIsConnecting(true)
    
    try {
      // Redirect to Trustpilot OAuth flow
      const apiUrl = getPortalApiUrl()
      window.location.href = `${apiUrl}/reputation/oauth/trustpilot/authorize?project_id=${projectId}`
    } catch (error) {
      console.error('Failed to initiate Trustpilot OAuth:', error)
      setError(error.response?.data?.message || 'Failed to connect Trustpilot')
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
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
              You'll be redirected to Trustpilot to authorize this connection.
            </p>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect {config.name} at any time from the Platforms view.
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
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Yelp API Key Dialog (not OAuth, uses API key)
export function YelpApiKeyDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [businessId, setBusinessId] = useState('')
  const config = PLATFORM_CONFIG.yelp

  const handleConnect = async () => {
    if (!apiKey.trim() || !businessId.trim()) {
      setError('Please enter both API key and business ID')
      return
    }

    setError(null)
    setIsConnecting(true)
    
    try {
      await reputationApi.post('/reputation/platforms/yelp/connect', {
        project_id: projectId,
        api_key: apiKey,
        business_id: businessId,
      })
      toast.success('Yelp connected successfully!')
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to connect Yelp:', error)
      setError(error.response?.data?.message || 'Failed to connect Yelp')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yelp-api-key">Yelp Fusion API Key</Label>
              <Input
                id="yelp-api-key"
                type="password"
                placeholder="Enter your Yelp API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a 
                  href="https://www.yelp.com/developers/v3/manage_app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Yelp Fusion Developer Portal
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yelp-business-id">Business ID or Alias</Label>
              <Input
                id="yelp-business-id"
                placeholder="e.g., my-business-name-new-york"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your business ID in your Yelp business page URL
              </p>
            </div>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll enable:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>
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
            disabled={isConnecting || !apiKey.trim() || !businessId.trim()}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick Connect Platforms Dialog - shows all available platforms
export function ConnectPlatformsDialog({ open, onOpenChange, projectId, platforms = [], onSuccess }) {
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Determine which platforms are already connected
  const connectedPlatforms = platforms.reduce((acc, p) => {
    if (p.isConnected) acc[p.platformType] = true
    return acc
  }, {})

  const handlePlatformClick = (platformKey) => {
    setSelectedPlatform(platformKey)
  }

  const handleConnect = async (platformKey) => {
    setIsConnecting(true)
    try {
      if (platformKey === 'yelp') {
        // Yelp needs API key dialog - close this and parent will handle
        onOpenChange(false)
        return platformKey // Signal to parent to open Yelp dialog
      }
      // For OAuth platforms, redirect
      window.location.href = `${reputationApi.defaults?.baseURL || '/api'}/reputation/oauth/${platformKey}/authorize/${projectId}`
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Connect Review Platforms
          </DialogTitle>
          <DialogDescription>
            Connect your review platforms to sync reviews automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
            const isConnected = connectedPlatforms[key]
            return (
              <button
                key={key}
                onClick={() => !isConnected && handleConnect(key)}
                disabled={isConnected || isConnecting}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  isConnected 
                    ? 'border-[var(--glass-border)] bg-[var(--glass-bg-inset)] opacity-60 cursor-default'
                    : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 bg-[var(--glass-bg)] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{config.name}</span>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {config.oauth ? 'OAuth connection' : 'API key required'}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand-primary)' }}>
                      <CheckCircle2 className="h-4 w-4" />
                      Connected
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: config.color, color: config.color }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnect(key)
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
