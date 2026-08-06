import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function AdminArtists() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Artists</h1>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search artists..." leftIcon={<Search className="h-4 w-4" />} />
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No artists found</div>
        </CardContent>
      </Card>
    </div>
  )
}
