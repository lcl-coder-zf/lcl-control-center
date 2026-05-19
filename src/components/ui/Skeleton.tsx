export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'rgba(0,40,80,0.07)', ...style }}
    />
  )
}

export function PageSkeleton() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Skeleton style={{ width: 80, height: 12 }} />
          <Skeleton style={{ width: 200, height: 32 }} />
          <Skeleton style={{ width: 140, height: 14 }} />
        </div>
        <Skeleton style={{ width: 140, height: 40, borderRadius: 12 }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1,2,3].map(i => <Skeleton key={i} style={{ height: 56, borderRadius: 12 }} />)}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[1,2,3,4].map(i => <Skeleton key={i} style={{ width: 80, height: 32, borderRadius: 12 }} />)}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} style={{ height: 76, borderRadius: 16 }} />)}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-8 space-y-2">
        <Skeleton style={{ width: 80, height: 12 }} />
        <Skeleton style={{ width: 160, height: 32 }} />
        <Skeleton style={{ width: 200, height: 14 }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} style={{ height: 100, borderRadius: 16 }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => <Skeleton key={i} style={{ height: 220, borderRadius: 16 }} />)}
        <Skeleton style={{ height: 140, borderRadius: 16 }} className="lg:col-span-2" />
      </div>
    </div>
  )
}
