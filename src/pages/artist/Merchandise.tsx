import { useAuthStore } from '@/store'
import { useSellerMerchandise } from '@/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/utils'

export default function ArtistMerchandise() {
  const { user } = useAuthStore()
  const { data: merchandise, isLoading } = useSellerMerchandise(user?.id || '')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">My Merchandise</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-mid-gray rounded-lg animate-pulse" />
          ))}
        </div>
      ) : merchandise && merchandise.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {merchandise.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square bg-mid-gray">
                <img
                  src={item.images?.[0] || '/placeholder-product.jpg'}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-white truncate">{item.title}</h3>
                <p className="text-electric font-semibold">{formatPrice(item.price)}</p>
                <p className="text-xs text-gray-400">{item.stock} in stock</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No merchandise yet</h3>
          <p className="text-gray-400 mb-6">Start selling your merchandise to fans</p>
          <Button>Add Product</Button>
        </div>
      )}
    </div>
  )
}
