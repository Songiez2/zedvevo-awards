import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { useArtists } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/avatar'
import { formatNumber } from '@/utils'

export default function ArtistsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: artists, isLoading } = useArtists(50)

  const filteredArtists = artists?.filter(
    (artist) =>
      artist.stage_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Artists</h1>
          <p className="text-gray-400">Discover your favorite Zambian artists</p>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="mb-8">
          <Input
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {isLoading ? (
            Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)
          ) : filteredArtists?.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No artists found</h3>
              <p className="text-gray-400">Try adjusting your search</p>
            </div>
          ) : (
            filteredArtists?.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/artist/${artist.id}`}>
                  <Card className="group cursor-pointer overflow-hidden text-center">
                    <CardContent className="p-4">
                      <div className="relative mx-auto mb-3">
                        <UserAvatar
                          name={artist.stage_name}
                          image={artist.user?.avatar_url}
                          size="xl"
                          className="mx-auto"
                        />
                        {artist.verified && (
                          <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2" variant="default">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-white truncate">{artist.stage_name}</h3>
                      <p className="text-sm text-gray-400">
                        {formatNumber(artist.total_followers)} followers
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatNumber(artist.monthly_listeners)} monthly listeners
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
