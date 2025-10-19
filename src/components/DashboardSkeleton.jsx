import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * DashboardSkeleton - Animated skeleton loader for dashboard content
 * Matches the layout of actual dashboard cards for seamless loading state
 */

export function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
          <div className="h-3 w-48 bg-gray-100 rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

export function ListSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="h-5 w-40 bg-gray-200 rounded"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-100 rounded"></div>
            </div>
            <div className="h-3 w-48 bg-gray-100 rounded"></div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function GridSkeleton({ columns = 2 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
      <ListSkeleton />
      <ListSkeleton />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome section skeleton */}
      <div className="bg-gray-200 rounded-lg p-6 h-24"></div>
      
      {/* Stats skeleton */}
      <StatsSkeleton />
      
      {/* Content area skeleton */}
      <GridSkeleton columns={2} />
    </div>
  )
}

export default DashboardSkeleton
