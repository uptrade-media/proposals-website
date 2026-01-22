// src/components/seo/SEOLocalSeo.jsx
// Local SEO Module - Comprehensive local search optimization
import { useState } from 'react'
import { useSignalAccess } from '@/lib/signal-access'
import SignalUpgradeCard from './signal/SignalUpgradeCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Map, 
  Building2,
  Globe,
  FileText
} from 'lucide-react'

// Import local SEO sub-components
import { 
  LocalSeoHeatMap,
  LocalSeoEntityHealth,
  LocalSeoGeoPages,
  LocalSeoCitations
} from './local'

// Tab configuration
const LOCAL_SEO_TABS = [
  { 
    id: 'heat-map', 
    label: 'Heat Map', 
    icon: Map,
    description: 'Visual ranking grid overlay'
  },
  { 
    id: 'entity-health', 
    label: 'Entity Health', 
    icon: Building2,
    description: 'GBP optimization scores'
  },
  { 
    id: 'geo-pages', 
    label: 'Geo Pages', 
    icon: FileText,
    description: 'Location landing pages'
  },
  { 
    id: 'citations', 
    label: 'Citations', 
    icon: Globe,
    description: 'NAP consistency'
  }
]

export default function SEOLocalSeo({ projectId }) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const [activeTab, setActiveTab] = useState('heat-map')

  // Show upgrade prompt if no Signal access
  if (!hasSignalAccess) {
    return (
      <div className="p-6">
        <SignalUpgradeCard feature="default" variant="default" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Local SEO</h1>
        <p className="text-muted-foreground">
          Dominate local search with heat maps, entity optimization, and citation management
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/30 border border-border/50 p-1 h-auto flex-wrap">
          {LOCAL_SEO_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Heat Map Tab */}
        <TabsContent value="heat-map" className="mt-6">
          <LocalSeoHeatMap projectId={projectId} />
        </TabsContent>

        {/* Entity Health Tab */}
        <TabsContent value="entity-health" className="mt-6">
          <LocalSeoEntityHealth projectId={projectId} />
        </TabsContent>

        {/* Geo Pages Tab */}
        <TabsContent value="geo-pages" className="mt-6">
          <LocalSeoGeoPages projectId={projectId} />
        </TabsContent>

        {/* Citations Tab */}
        <TabsContent value="citations" className="mt-6">
          <LocalSeoCitations projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
