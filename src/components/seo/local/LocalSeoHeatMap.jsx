// src/components/seo/local/LocalSeoHeatMap.jsx
// Local SEO Heat Map - Google Maps integration with ranking grid overlay
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  RefreshCw, 
  MapPin, 
  Settings2,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

// Color scale for rankings - brand green for #1, through yellow to red
const getRankingColor = (position) => {
  if (!position) return '#9ca3af' // Gray for not found
  if (position === 1) return '#4bbf39' // Brand green - #1
  if (position === 2) return '#6bc958' 
  if (position === 3) return '#8bd377'
  if (position <= 5) return '#fbbf24' // Yellow for 4-5
  if (position <= 10) return '#f97316' // Orange for 6-10
  if (position <= 15) return '#ef4444' // Red for 11-15
  return '#dc2626' // Dark red for 16-20
}

// Get cell opacity based on data freshness
const getCellOpacity = (crawledAt) => {
  if (!crawledAt) return 0.3
  const hoursSince = (Date.now() - new Date(crawledAt).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 24) return 1.0
  if (hoursSince < 72) return 0.8
  if (hoursSince < 168) return 0.6 // 1 week
  return 0.4
}

export default function LocalSeoHeatMap({ projectId }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlaysRef = useRef([])
  
  const [selectedGrid, setSelectedGrid] = useState(null)
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [heatMapData, setHeatMapData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)

  const { 
    localGrids,
    fetchLocalGrids,
    fetchHeatMapData,
    localGridsLoading
  } = useSeoStore()

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setGoogleMapsLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.GOOGLE_CLOUD_API_KEY}&libraries=visualization`
    script.async = true
    script.defer = true
    script.onload = () => setGoogleMapsLoaded(true)
    script.onerror = () => console.error('Failed to load Google Maps')
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [])

  // Fetch grids on mount
  useEffect(() => {
    if (projectId) {
      fetchLocalGrids(projectId)
    }
  }, [projectId])

  // Auto-select first grid
  useEffect(() => {
    if (localGrids?.length > 0 && !selectedGrid) {
      setSelectedGrid(localGrids[0])
      if (localGrids[0].keywords?.length > 0) {
        setSelectedKeyword(localGrids[0].keywords[0])
      }
    }
  }, [localGrids])

  // Fetch heat map data when grid/keyword changes
  useEffect(() => {
    if (selectedGrid?.id && selectedKeyword) {
      loadHeatMapData()
    }
  }, [selectedGrid?.id, selectedKeyword])

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (googleMapsLoaded && mapRef.current && selectedGrid && !mapInstanceRef.current) {
      initializeMap()
    }
  }, [googleMapsLoaded, selectedGrid])

  // Update overlays when data changes
  useEffect(() => {
    if (mapInstanceRef.current && heatMapData.length > 0) {
      renderGridOverlay()
    }
  }, [heatMapData])

  const initializeMap = () => {
    if (!selectedGrid) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: Number(selectedGrid.center_lat), lng: Number(selectedGrid.center_lng) },
      zoom: 11,
      mapTypeId: 'roadmap',
      styles: [
        // Minimal light style for better overlay visibility
        { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
        { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    })

    // Add center marker (business location)
    new window.google.maps.Marker({
      position: { lat: Number(selectedGrid.center_lat), lng: Number(selectedGrid.center_lng) },
      map: map,
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#4bbf39" stroke="white" stroke-width="3"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      },
      title: 'Business Location',
      zIndex: 1000
    })

    mapInstanceRef.current = map
  }

  const renderGridOverlay = () => {
    // Clear existing overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null))
    overlaysRef.current = []

    if (!mapInstanceRef.current || !selectedGrid) return

    const gridSize = selectedGrid.grid_size || 7
    const radiusMiles = Number(selectedGrid.radius_miles) || 10
    
    // Calculate cell size in degrees (approximate)
    const latDegreeMiles = 69.0
    const lngDegreeMiles = Math.cos(Number(selectedGrid.center_lat) * Math.PI / 180) * 69.0
    
    const totalLatDegrees = (radiusMiles * 2) / latDegreeMiles
    const totalLngDegrees = (radiusMiles * 2) / lngDegreeMiles
    
    const cellLatSize = totalLatDegrees / gridSize
    const cellLngSize = totalLngDegrees / gridSize
    
    const startLat = Number(selectedGrid.center_lat) + (radiusMiles / latDegreeMiles)
    const startLng = Number(selectedGrid.center_lng) - (radiusMiles / lngDegreeMiles)

    // Create data lookup map
    const dataMap = new Map()
    heatMapData.forEach(point => {
      dataMap.set(`${point.row_index}-${point.col_index}`, point)
    })

    // Create grid cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellData = dataMap.get(`${row}-${col}`)
        const position = cellData?.ranking_position
        const color = getRankingColor(position)
        const opacity = getCellOpacity(cellData?.crawled_at)

        const cellLat = startLat - (row * cellLatSize) - (cellLatSize / 2)
        const cellLng = startLng + (col * cellLngSize) + (cellLngSize / 2)

        // Create rectangle for cell
        const bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(cellLat - cellLatSize/2, cellLng - cellLngSize/2),
          new window.google.maps.LatLng(cellLat + cellLatSize/2, cellLng + cellLngSize/2)
        )

        const rectangle = new window.google.maps.Rectangle({
          bounds: bounds,
          strokeColor: '#ffffff',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: opacity * 0.7,
          map: mapInstanceRef.current,
          zIndex: position ? (21 - position) : 0
        })

        // Add click listener for drill-down
        rectangle.addListener('click', () => {
          setSelectedCell({
            row,
            col,
            data: cellData,
            lat: cellLat,
            lng: cellLng
          })
        })

        // Add hover effect
        rectangle.addListener('mouseover', () => {
          rectangle.setOptions({ 
            strokeWeight: 3,
            strokeColor: '#4bbf39'
          })
        })
        rectangle.addListener('mouseout', () => {
          rectangle.setOptions({ 
            strokeWeight: 1,
            strokeColor: '#ffffff'
          })
        })

        // Add rank label in center of cell
        if (position) {
          const label = new window.google.maps.Marker({
            position: { lat: cellLat, lng: cellLng },
            map: mapInstanceRef.current,
            icon: {
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                  <circle cx="15" cy="15" r="12" fill="white" stroke="${color}" stroke-width="2"/>
                  <text x="15" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${position}</text>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(30, 30),
              anchor: new window.google.maps.Point(15, 15)
            },
            zIndex: position ? (100 - position) : 0
          })
          overlaysRef.current.push(label)
        }

        overlaysRef.current.push(rectangle)
      }
    }
  }

  const loadHeatMapData = async () => {
    if (!selectedGrid?.id || !selectedKeyword) return
    setIsLoading(true)
    try {
      const data = await fetchHeatMapData(selectedGrid.id, selectedKeyword)
      setHeatMapData(data || [])
    } catch (error) {
      console.error('Failed to load heat map data:', error)
    }
    setIsLoading(false)
  }

  // Calculate stats from heat map data
  const stats = {
    avgRank: heatMapData.length > 0 
      ? (heatMapData.filter(d => d.ranking_position).reduce((sum, d) => sum + d.ranking_position, 0) / 
         heatMapData.filter(d => d.ranking_position).length).toFixed(1)
      : '-',
    top3Count: heatMapData.filter(d => d.ranking_position && d.ranking_position <= 3).length,
    localPackCount: heatMapData.filter(d => d.ranking_type === 'local_pack').length,
    notFoundCount: heatMapData.filter(d => !d.ranking_position).length,
    totalCells: (selectedGrid?.grid_size || 7) ** 2
  }

  if (!import.meta.env.GOOGLE_CLOUD_API_KEY) {
    return (
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-[var(--accent-orange)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Google Maps API Key Required</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Add GOOGLE_CLOUD_API_KEY to your environment to enable heat maps.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Grid Selector */}
        <Select 
          value={selectedGrid?.id || ''} 
          onValueChange={(id) => {
            const grid = localGrids.find(g => g.id === id)
            setSelectedGrid(grid)
            if (grid?.keywords?.length > 0) {
              setSelectedKeyword(grid.keywords[0])
            }
          }}
        >
          <SelectTrigger className="w-[220px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <MapPin className="h-4 w-4 mr-2 text-[var(--brand-primary)]" />
            <SelectValue placeholder="Select location grid" />
          </SelectTrigger>
          <SelectContent>
            {localGrids?.map(grid => (
              <SelectItem key={grid.id} value={grid.id}>
                {grid.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Keyword Selector */}
        {selectedGrid?.keywords?.length > 0 && (
          <Select value={selectedKeyword || ''} onValueChange={setSelectedKeyword}>
            <SelectTrigger className="w-[280px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <SelectValue placeholder="Select keyword" />
            </SelectTrigger>
            <SelectContent>
              {selectedGrid.keywords.map(kw => (
                <SelectItem key={kw} value={kw}>
                  {kw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="border-[var(--glass-border)]"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Settings
        </Button>

        <Button 
          onClick={loadHeatMapData}
          disabled={isLoading}
          size="sm"
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button variant="outline" size="sm" className="border-[var(--glass-border)]">
          <Plus className="h-4 w-4 mr-2" />
          New Grid
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.avgRank}</p>
            <p className="text-sm text-[var(--text-secondary)]">Avg. Rank</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--brand-primary)]">{stats.top3Count}</p>
            <p className="text-sm text-[var(--text-secondary)]">Top 3 Cells</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-blue)]">{stats.localPackCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">Local Pack</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-red)]">{stats.notFoundCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">Not Found</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalCells}</p>
            <p className="text-sm text-[var(--text-secondary)]">Grid Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] overflow-hidden">
            <div 
              ref={mapRef} 
              className="w-full h-[600px]"
              style={{ minHeight: '600px' }}
            />
            {!googleMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            )}
          </Card>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4bbf39' }} />
              <span className="text-sm text-[var(--text-secondary)]">#1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8bd377' }} />
              <span className="text-sm text-[var(--text-secondary)]">2-3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
              <span className="text-sm text-[var(--text-secondary)]">4-5</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-sm text-[var(--text-secondary)]">6-10</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-sm text-[var(--text-secondary)]">11-15</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9ca3af' }} />
              <span className="text-sm text-[var(--text-secondary)]">Not Found</span>
            </div>
          </div>
        </div>

        {/* Selected Cell Details */}
        <div className="lg:col-span-1">
          {selectedCell ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-[var(--brand-primary)]" />
                  Grid Cell Details
                </CardTitle>
                <CardDescription>
                  Row {selectedCell.row + 1}, Col {selectedCell.col + 1}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCell.data ? (
                  <>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Ranking Position</p>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-3xl font-bold"
                          style={{ color: getRankingColor(selectedCell.data.ranking_position) }}
                        >
                          {selectedCell.data.ranking_position || 'N/A'}
                        </span>
                        {selectedCell.data.ranking_type && (
                          <Badge 
                            variant="outline"
                            className="capitalize"
                          >
                            {selectedCell.data.ranking_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Search Location</p>
                      <p className="text-[var(--text-primary)]">
                        {selectedCell.data.search_location || 
                          `${selectedCell.lat.toFixed(4)}, ${selectedCell.lng.toFixed(4)}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Last Checked</p>
                      <p className="text-[var(--text-primary)]">
                        {selectedCell.data.crawled_at 
                          ? new Date(selectedCell.data.crawled_at).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>

                    {selectedCell.data.competitors_above && (
                      <div>
                        <p className="text-sm text-[var(--text-secondary)] mb-2">Competitors Above</p>
                        <div className="space-y-2">
                          {selectedCell.data.competitors_above.slice(0, 5).map((comp, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between p-2 bg-[var(--glass-bg-inset)] rounded"
                            >
                              <span className="text-sm text-[var(--text-primary)]">
                                #{comp.position} {comp.name}
                              </span>
                              {comp.rating && (
                                <span className="text-sm text-[var(--text-secondary)]">
                                  ⭐ {comp.rating}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      No ranking data for this cell
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="py-12 text-center">
                <Eye className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Click a grid cell to view details
                </p>
              </CardContent>
            </Card>
          )}

          {/* Keyword Performance Summary */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Keyword Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedGrid?.keywords?.map(kw => (
                <div 
                  key={kw}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    kw === selectedKeyword 
                      ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]' 
                      : 'bg-[var(--glass-bg-inset)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
                  onClick={() => setSelectedKeyword(kw)}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{kw}</p>
                  {/* Could add mini-stats per keyword here */}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
