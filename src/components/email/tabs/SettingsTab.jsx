/**
 * SettingsTab - Email Platform Settings
 * Code-split from EmailPlatform.jsx for better load performance
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import { useEmailPlatformStore } from '@/lib/email-platform-store'

export default function SettingsTab() {
  const { currentOrg } = useAuthStore()
  const { settings: storeSettings, settingsLoading, fetchSettings, updateSettings, validateApiKey } = useEmailPlatformStore()
  const [localSettings, setLocalSettings] = useState({
    resend_api_key: '',
    default_from_name: '',
    default_from_email: '',
    default_reply_to: '',
    brand_color: '#4F46E5',
    logo_url: '',
    business_address: '',
    track_opens: true,
    track_clicks: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (storeSettings) {
      setLocalSettings(storeSettings)
      setApiKeyValid(storeSettings.resend_api_key_valid)
    }
  }, [storeSettings])

  const handleValidateApiKey = async () => {
    if (!localSettings.resend_api_key) {
      toast.error('Enter an API key first')
      return
    }

    setIsValidating(true)
    try {
      const result = await validateApiKey(localSettings.resend_api_key)
      setApiKeyValid(result.valid)
      if (result.valid) {
        toast.success('API key is valid!')
      } else {
        toast.error('Invalid API key')
      }
    } catch (err) {
      toast.error('Failed to validate API key')
      setApiKeyValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      toast.success('Settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Resend API Configuration</CardTitle>
          <CardDescription>Connect your Resend account to send emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">API Key</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={localSettings.resend_api_key}
                onChange={(e) => setLocalSettings({ ...localSettings, resend_api_key: e.target.value })}
                placeholder="re_..."
                className="font-mono"
              />
              <Button 
                variant="outline" 
                onClick={handleValidateApiKey}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : apiKeyValid === true ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : apiKeyValid === false ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className="text-primary hover:underline">resend.com/api-keys</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Sender</CardTitle>
          <CardDescription>Default sender information for campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Name</label>
              <Input
                value={localSettings.default_from_name}
                onChange={(e) => setLocalSettings({ ...localSettings, default_from_name: e.target.value })}
                placeholder="Your Company"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Email</label>
              <Input
                type="email"
                value={localSettings.default_from_email}
                onChange={(e) => setLocalSettings({ ...localSettings, default_from_email: e.target.value })}
                placeholder="hello@yourdomain.com"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Reply-To Email</label>
            <Input
              type="email"
              value={localSettings.default_reply_to}
              onChange={(e) => setLocalSettings({ ...localSettings, default_reply_to: e.target.value })}
              placeholder="support@yourdomain.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize your email appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localSettings.brand_color}
                onChange={(e) => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <Input
                value={localSettings.brand_color}
                onChange={(e) => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="w-28 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Logo URL</label>
            <Input
              value={localSettings.logo_url}
              onChange={(e) => setLocalSettings({ ...localSettings, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Business Address (Required for CAN-SPAM)</label>
            <Input
              value={localSettings.business_address}
              onChange={(e) => setLocalSettings({ ...localSettings, business_address: e.target.value })}
              placeholder="123 Business St, City, State 12345"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
