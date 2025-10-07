import React from 'react'

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  )
}