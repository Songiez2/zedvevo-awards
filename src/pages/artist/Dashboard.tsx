import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { ARTIST_NAV } from '@/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { Music, Upload, BarChart2, DollarSign, Users, Play, TrendingUp } from 'lucide-react'
import { formatNumber } from '@/utils'

export default function ArtistDashboard() {
  const { user, artist } = useAuthStore()

  const stats = [
    { label: 'Total Streams', value: formatNumber(artist?.total_streams || 0), icon: Play },
    { label: 'Followers', value: formatNumber(artist?.total_followers || 0), icon: Users },
    { label: 'Monthly Listeners', value: formatNumber(artist?.monthly_listeners || 0), icon: TrendingUp },
    { label: 'Revenue', value: 'ZMW 0', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Artist Dashboard</h2>
            <nav className="space-y-1">
              {ARTIST_NAV.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-mid-gray transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {artist?.stage_name || user?.full_name}</h1>
            <p className="text-gray-400">Here's what's happening with your music</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link to="/artist/upload">
              <Card className="cursor-pointer hover:bg-mid-gray transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-electric/20 rounded-lg">
                    <Upload className="h-6 w-6 text-electric" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Upload Song</h3>
                    <p className="text-sm text-gray-400">Share new music</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/artist/upload-video">
              <Card className="cursor-pointer hover:bg-mid-gray transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-electric/20 rounded-lg">
                    <Music className="h-6 w-6 text-electric" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Upload Video</h3>
                    <p className="text-sm text-gray-400">Add music videos</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/artist/events">
              <Card className="cursor-pointer hover:bg-mid-gray transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-electric/20 rounded-lg">
                    <BarChart2 className="h-6 w-6 text-electric" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Create Event</h3>
                    <p className="text-sm text-gray-400">Sell tickets</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <stat.icon className="h-5 w-5 text-electric" />
                    <span className="text-gray-400 text-sm">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                No recent activity. Upload your first song to get started!
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
