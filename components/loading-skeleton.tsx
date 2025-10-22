// ローディングスケルトンUI - 高速でスムーズな体験

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20 animate-pulse">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダースケルトン */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gray-300 rounded-2xl"></div>
            <div className="h-10 w-64 bg-gray-300 rounded"></div>
          </div>
          <div className="ml-16 h-6 w-48 bg-gray-200 rounded"></div>
        </div>

        {/* 統計カードスケルトン */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gray-300 rounded-xl mb-3"></div>
              <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-16 bg-gray-300 rounded mb-1"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* コンテンツエリアスケルトン */}
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="h-7 w-48 bg-gray-300 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow animate-pulse">
      {/* ヘッダー */}
      <div className="border-b p-4">
        <div className="h-6 w-48 bg-gray-300 rounded"></div>
      </div>
      
      {/* テーブル行 */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-gray-300 rounded"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-6 w-32 bg-gray-300 rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 rounded"></div>
        <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
        <div className="h-4 w-4/6 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-gray-300 rounded"></div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-2">
        {/* 曜日ヘッダー */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded"></div>
        ))}
        
        {/* 日付セル */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-5 w-24 bg-gray-300 rounded mb-2"></div>
          <div className="h-10 w-full bg-gray-200 rounded"></div>
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <div className="h-10 w-24 bg-gray-300 rounded"></div>
        <div className="h-10 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

