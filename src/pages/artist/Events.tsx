import { useAuthStore } from '@/store'
import { useArtistEvents } from '@/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, MapPin, Ticket } from 'lucide-react'
import { formatDate, formatPrice } from '@/utils'

export default function ArtistEvents() {
  const { artist } = useAuthStore()
  const { data: events, isLoading } = useArtistEvents(artist?.id || '')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">My Events</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-mid-gray rounded-lg animate-pulse" />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-electric-blue/20 to-electric/10 flex items-center justify-center">
                <Calendar className="h-12 w-12 text-electric" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-2">{event.title}</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(event.event_date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.venue}, {event.city}
                  </p>
                  <p className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    {event.tickets_sold}/{event.total_tickets} sold
                  </p>
                </div>
                <p className="text-electric font-semibold mt-3">
                  From {formatPrice(event.ticket_price)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No events yet</h3>
          <p className="text-gray-400 mb-6">Create an event to sell tickets to your fans</p>
          <Button>Create Event</Button>
        </div>
      )}
    </div>
  )
}
