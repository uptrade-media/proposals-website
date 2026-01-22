// src/components/seo/local/LocalSeoCitations.jsx
// Citation Management - NAP consistency tracking across sources
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  RefreshCw, 
  Globe,
  FileText,
  Search,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Phone,
  MapPin
} from 'lucide-react'

// Popular citation sources
const CITATION_SOURCES = [
  'Google Business Profile',
  'Yelp',
  'Facebook',
  'Apple Maps',
  'Bing Places',
  'Yellow Pages',
  'Better Business Bureau',
  'Angi',
  'Thumbtack',
  'Houzz',
  'Manta',
  'Foursquare',
  'Citysearch',
  'MapQuest',
  'Superpages'
]

export default function LocalSeoCitations({ projectId }) {
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { 
    citations,
    fetchCitations,
    citationsLoading,
    canonicalNap // The "correct" NAP to compare against
  } = useSeoStore()

  useEffect(() => {
    if (projectId) {
      fetchCitations(projectId)
    }
  }, [projectId])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      await fetchCitations(projectId)
    } catch (error) {
      console.error('Failed to fetch citations:', error)
    }
    setIsLoading(false)
  }

  // Filter citations
  const filteredCitations = (citations || [])
    .filter(cit => {
      const matchesSearch = !searchTerm || 
        cit.source_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (filterStatus === 'all') return matchesSearch
      if (filterStatus === 'consistent') {
        return matchesSearch && cit.name_matches && cit.address_matches && cit.phone_matches
      }
      if (filterStatus === 'inconsistent') {
        return matchesSearch && (!cit.name_matches || !cit.address_matches || !cit.phone_matches)
      }
      return matchesSearch
    })

  // Calculate stats
  const stats = {
    total: citations?.length || 0,
    consistent: citations?.filter(c => c.name_matches && c.address_matches && c.phone_matches).length || 0,
    nameIssues: citations?.filter(c => !c.name_matches).length || 0,
    addressIssues: citations?.filter(c => !c.address_matches).length || 0,
    phoneIssues: citations?.filter(c => !c.phone_matches).length || 0
  }

  const consistencyScore = stats.total > 0 
    ? Math.round((stats.consistent / stats.total) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Citation Management</h2>
          <p className="text-[var(--text-secondary)]">
            Track NAP consistency across citation sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="border-[var(--glass-border)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
          <Button 
            onClick={handleRefresh}
            disabled={isLoading || citationsLoading}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Scan Citations
          </Button>
        </div>
      </div>

      {/* Canonical NAP Card */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
            Canonical Business Information
          </CardTitle>
          <CardDescription>
            Your official NAP (Name, Address, Phone) that all citations should match
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canonicalNap ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[var(--text-secondary)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Business Name</p>
                  <p className="font-medium text-[var(--text-primary)]">{canonicalNap.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[var(--text-secondary)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Address</p>
                  <p className="font-medium text-[var(--text-primary)]">{canonicalNap.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[var(--text-secondary)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Phone</p>
                  <p className="font-medium text-[var(--text-primary)]">{canonicalNap.phone}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--text-secondary)]">
                Set up your canonical business information to track consistency
              </p>
              <Button variant="outline" className="mt-2">
                Configure NAP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{consistencyScore}%</p>
            <p className="text-sm text-[var(--text-secondary)]">Consistency Score</p>
            <Progress value={consistencyScore} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <Globe className="h-5 w-5 mx-auto mb-2 text-[var(--text-secondary)]" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            <p className="text-sm text-[var(--text-secondary)]">Total Sources</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-2 text-[var(--brand-primary)]" />
            <p className="text-2xl font-bold text-[var(--brand-primary)]">{stats.consistent}</p>
            <p className="text-sm text-[var(--text-secondary)]">Consistent</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-[var(--accent-orange)]" />
            <p className="text-2xl font-bold text-[var(--accent-orange)]">
              {stats.total - stats.consistent}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Inconsistent</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-2 text-[var(--text-secondary)]" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {CITATION_SOURCES.length - stats.total}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Unclaimed</p>
          </CardContent>
        </Card>
      </div>

      {/* Issue Breakdown */}
      {(stats.nameIssues > 0 || stats.addressIssues > 0 || stats.phoneIssues > 0) && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle>Consistency Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${stats.nameIssues > 0 ? 'bg-[var(--accent-red)]/10' : 'bg-[var(--brand-primary)]/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={`h-4 w-4 ${stats.nameIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`} />
                  <span className="font-medium text-[var(--text-primary)]">Name</span>
                </div>
                <p className={`text-2xl font-bold ${stats.nameIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`}>
                  {stats.nameIssues}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {stats.nameIssues === 0 ? 'All consistent' : 'inconsistencies'}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${stats.addressIssues > 0 ? 'bg-[var(--accent-red)]/10' : 'bg-[var(--brand-primary)]/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className={`h-4 w-4 ${stats.addressIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`} />
                  <span className="font-medium text-[var(--text-primary)]">Address</span>
                </div>
                <p className={`text-2xl font-bold ${stats.addressIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`}>
                  {stats.addressIssues}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {stats.addressIssues === 0 ? 'All consistent' : 'inconsistencies'}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${stats.phoneIssues > 0 ? 'bg-[var(--accent-red)]/10' : 'bg-[var(--brand-primary)]/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className={`h-4 w-4 ${stats.phoneIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`} />
                  <span className="font-medium text-[var(--text-primary)]">Phone</span>
                </div>
                <p className={`text-2xl font-bold ${stats.phoneIssues > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--brand-primary)]'}`}>
                  {stats.phoneIssues}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {stats.phoneIssues === 0 ? 'All consistent' : 'inconsistencies'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
            
            <div className="flex gap-1">
              {['all', 'consistent', 'inconsistent'].map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className={filterStatus === status 
                    ? 'bg-[var(--brand-primary)]' 
                    : 'border-[var(--glass-border)]'
                  }
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Citations Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Source</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCitations.length > 0 ? (
                filteredCitations.map((cit) => {
                  const isConsistent = cit.name_matches && cit.address_matches && cit.phone_matches

                  return (
                    <TableRow 
                      key={cit.id} 
                      className="border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
                          <span className="font-medium text-[var(--text-primary)]">
                            {cit.source_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cit.name_matches ? (
                            <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[var(--accent-red)]" />
                          )}
                          <span className={`text-sm ${cit.name_matches ? 'text-[var(--text-primary)]' : 'text-[var(--accent-red)]'}`}>
                            {cit.name_found || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cit.address_matches ? (
                            <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[var(--accent-red)]" />
                          )}
                          <span className={`text-sm ${cit.address_matches ? 'text-[var(--text-primary)]' : 'text-[var(--accent-red)]'} max-w-[200px] truncate`}>
                            {cit.address_found || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cit.phone_matches ? (
                            <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[var(--accent-red)]" />
                          )}
                          <span className={`text-sm ${cit.phone_matches ? 'text-[var(--text-primary)]' : 'text-[var(--accent-red)]'}`}>
                            {cit.phone_found || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={isConsistent 
                            ? 'bg-[var(--brand-primary)] text-white border-0'
                            : 'bg-[var(--accent-red)] text-white border-0'
                          }
                        >
                          {isConsistent ? 'Consistent' : 'Issues'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {cit.listing_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={cit.listing_url} target="_blank" rel="noopener">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Globe className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No citations match your filters'
                        : 'No citations tracked yet'
                      }
                    </p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Scan for Citations
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
