import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Play, DollarSign, BarChart3 } from 'lucide-react'
import { formatNumber } from '@/utils'

export default function ArtistAnalytics() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-electric" />
              <span className="text-gray-400 text-sm">Total Streams</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-electric" />
              <span className="text-gray-400 text-sm">Followers</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-xs text-green-500 mt-1">+0 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Play className="h-5 w-5 text-electric" />
              <span className="text-gray-400 text-sm">Monthly Listeners</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-electric" />
              <span className="text-gray-400 text-sm">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">ZMW 0</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stream Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Analytics data will appear here once you have streams
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
