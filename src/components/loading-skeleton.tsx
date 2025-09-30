export function RoastLoadingSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse">
      {/* Score Section Skeleton */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="w-24 h-24 bg-gray-200 rounded-full" />
        </div>

        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />

        {/* Roast Text Skeleton */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>

        {/* Score Breakdown Skeleton */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Issues Section Skeleton */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50 border-l-4 border-gray-300">
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot Skeleton */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
        <div className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-200 h-96" />
      </div>
    </div>
  )
}

export function FormLoadingSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-14 bg-gray-200 rounded-xl" />
      <div className="h-14 bg-gray-200 rounded-xl" />
      <div className="mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-orange-200 rounded-full" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-orange-200 rounded-full" />
          <div className="h-4 w-52 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-orange-200 rounded-full" />
          <div className="h-4 w-44 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}