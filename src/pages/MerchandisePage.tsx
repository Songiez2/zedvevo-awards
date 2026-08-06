import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Minus, Plus, Share2, Heart, Check } from 'lucide-react'
import { useMerchandiseItem } from '@/hooks'
import { useCartStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/avatar'
import { formatPrice } from '@/utils'
import { useToast } from '@/components/ui/use-toast'

export default function MerchandisePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: item, isLoading, error } = useMerchandiseItem(slug!)
  const { addItem, items } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState(0)
  const { toast } = useToast()

  const isInCart = items.some((ci) => ci.merchandise_id === item?.id)

  const handleAddToCart = async () => {
    if (!item) return
    if (item.sizes?.length > 0 && !selectedSize) {
      toast({ title: 'Please select a size', variant: 'destructive' })
      return
    }
    if (item.colors?.length > 0 && !selectedColor) {
      toast({ title: 'Please select a color', variant: 'destructive' })
      return
    }
    try {
      await addItem(item.id, quantity, selectedSize || undefined, selectedColor || undefined)
      toast({ title: 'Added to cart', description: `${quantity} x ${item.title}` })
    } catch {
      toast({ title: 'Error adding to cart', variant: 'destructive' })
    }
  }

  if (error) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Product not found</h1>
        <Link to="/store">
          <Button>Back to Store</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square" />
          <div>
            <Skeleton className="w-32 h-6 mb-4" />
            <Skeleton className="w-64 h-10 mb-4" />
            <Skeleton className="w-full h-24" />
          </div>
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="min-h-screen">
      <div className="container px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-dark-gray mb-4">
              <img
                src={item.images?.[selectedImage] || '/placeholder-product.jpg'}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            {item.images && item.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === idx ? 'border-electric' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="secondary" className="mb-4">{item.category}</Badge>
            <h1 className="text-3xl font-bold text-white mb-2">{item.title}</h1>
            
            <p className="text-3xl font-bold text-electric mb-4">{formatPrice(item.price)}</p>
            
            {item.description && (
              <p className="text-gray-300 mb-6">{item.description}</p>
            )}

            {/* Seller */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-gray-400">Sold by:</span>
              <Link to={`/artist/${item.artist?.id}`} className="flex items-center gap-2">
                <UserAvatar
                  name={item.artist?.stage_name || item.seller?.full_name}
                  image={item.artist?.user?.avatar_url || item.seller?.avatar_url}
                  size="sm"
                />
                <span className="text-white hover:text-electric">
                  {item.artist?.stage_name || item.seller?.full_name}
                </span>
              </Link>
            </div>

            {/* Sizes */}
            {item.sizes && item.sizes.length > 0 && (
              <div className="mb-4">
                <p className="text-white font-medium mb-2">Size</p>
                <div className="flex gap-2 flex-wrap">
                  {item.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg border ${
                        selectedSize === size
                          ? 'border-electric bg-electric/20 text-white'
                          : 'border-border text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {item.colors && item.colors.length > 0 && (
              <div className="mb-4">
                <p className="text-white font-medium mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {item.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg border ${
                        selectedColor === color
                          ? 'border-electric bg-electric/20 text-white'
                          : 'border-border text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-white font-medium mb-2">Quantity</p>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold text-white w-12 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(item.stock, quantity + 1))}
                  disabled={quantity >= item.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-gray-400">
                  {item.stock} available
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={item.stock === 0 || isInCart}
                className="flex-1"
              >
                {isInCart ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    In Cart
                  </>
                ) : item.stock === 0 ? (
                  'Out of Stock'
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
