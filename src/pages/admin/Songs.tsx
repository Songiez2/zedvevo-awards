import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default function AdminSongs() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-3xl font-bold text-white mb-8">Songs</h1>
      <Card>
        <CardContent className="p-6">
          <Input placeholder="Search songs..." leftIcon={<Search className="h-4 w-4" />} className="mb-4" />
          <div className="text-center py-8 text-gray-500">No songs found</div>
        </CardContent>
      </Card>
    </div>
  )
}
