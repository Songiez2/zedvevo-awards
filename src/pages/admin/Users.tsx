import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function AdminUsers() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input placeholder="Search users..." leftIcon={<Search className="h-4 w-4" />} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
