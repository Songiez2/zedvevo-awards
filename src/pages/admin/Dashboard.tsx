import { Link } from 'react-router-dom'
import { ADMIN_NAV } from '@/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Music, Video, ShoppingBag, DollarSign, TrendingUp, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '0', icon: Users, href: '/admin/users' },
    { label: 'Songs', value: '0', icon: Music, href: '/admin/songs' },
    { label: 'Videos', value: '0', icon: Video, href: '/admin/videos' },
    { label: 'Merchandise', value: '0', icon: ShoppingBag, href: '/admin/merchandise' },
    { label: 'Revenue', value: 'ZMW 0', icon: DollarSign, href: '/admin/payments' },
    { label: 'Orders', value: '0', icon: TrendingUp, href: '/admin/orders' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Admin Panel</h2>
            <nav className="space-y-1">
              {ADMIN_NAV.map((item) => (
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
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome to ZedVevo Admin Panel</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {stats.map((stat) => (
              <Link key={stat.label} to={stat.href}>
                <Card className="cursor-pointer hover:bg-mid-gray transition-colors">
                  <CardContent className="p-6">
                    <stat.icon className="h-8 w-8 text-electric mb-2" />
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
