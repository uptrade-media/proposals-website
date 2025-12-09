import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Settings, BarChart3, FileText } from 'lucide-react'
import OneOffComposer from '@/components/email/OneOffComposer'
import NewsletterComposer from '@/components/email/NewsletterComposer'
import TemplatesManager from '@/components/email/TemplatesManager'
import ContactsManager from '@/components/email/ContactsManager'
import SettingsPanel from '@/components/email/SettingsPanel'
import ActivityLog from '@/components/email/ActivityLog'

export default function EmailManager() {
  const [activeTab, setActiveTab] = useState('one-off')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Email Manager</h1>
        <p className="text-[var(--text-secondary)] mt-1">Send campaigns, newsletters, and track engagement</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="one-off" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">One-Off</span>
          </TabsTrigger>
          <TabsTrigger value="newsletters" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Newsletters</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="one-off" className="space-y-6">
          <OneOffComposer />
        </TabsContent>

        <TabsContent value="newsletters" className="space-y-6">
          <NewsletterComposer />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <TemplatesManager />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <ContactsManager />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityLog />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
