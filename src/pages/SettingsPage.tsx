import { useState } from 'react'
import { useAuthStore } from '@/store'
import { useToast } from '@/components/ui/use-toast'
import { storageService } from '@/services'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { Camera, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const result = await storageService.uploadProfilePicture(file, user.id)
      if (result.error) throw new Error(result.error)

      await updateProfile({ avatar_url: result.url })
      toast({ title: 'Avatar updated successfully' })
    } catch (error) {
      toast({
        title: 'Error uploading avatar',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateProfile({
        full_name: fullName,
        username,
        bio,
      })
      toast({ title: 'Profile updated successfully' })
    } catch {
      toast({ title: 'Error updating profile', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      <div className="container px-4 py-8 max-w-2xl">
        {/* Profile Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <UserAvatar
                  name={fullName}
                  image={user?.avatar_url}
                  size="xl"
                  className="w-24 h-24"
                />
                <label className="absolute bottom-0 right-0 p-2 bg-electric rounded-full cursor-pointer hover:bg-electric/80">
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="text-white font-medium">{fullName || 'Your Name'}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>

            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-24 px-4 py-2 rounded-lg border border-border bg-dark-gray/50 text-white placeholder:text-gray-500 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
                placeholder="Tell us about yourself..."
              />
            </div>

            <Button onClick={handleSave} isLoading={isLoading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <div>
                <p className="text-white font-medium">Email</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <div>
                <p className="text-white font-medium">Password</p>
                <p className="text-sm text-gray-400">Last changed: Never</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="text-white font-medium">Role</p>
                <p className="text-sm text-gray-400 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Artist Section */}
        {user?.is_artist && (
          <Card>
            <CardHeader>
              <CardTitle>Artist Settings</CardTitle>
              <CardDescription>Manage your artist profile</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/artist'}>
                Go to Artist Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
