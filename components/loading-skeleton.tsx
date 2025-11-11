export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダースケルトン */}
        <div className="mb-8">
          <div className="h-12 w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse ml-16"></div>
        </div>

        {/* 統計カードスケルトン */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* 分析グラフスケルトン */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-xl">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* 業務分布スケルトン */}
        <div className="bg-white rounded-lg p-6 shadow-xl mb-8">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-full bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 売上分析スケルトン */}
        <div className="mt-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg p-6 animate-pulse h-32"></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-xl">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
