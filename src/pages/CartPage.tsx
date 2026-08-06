import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore, useAuthStore } from '@/store'
import { useCreateOrder, useCheckout } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/utils'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore()
  const createOrder = useCreateOrder()
  const checkout = useCheckout()
  const { toast } = useToast()
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    country: 'Zambia',
  })

  const subtotal = getTotal()
  const shippingFee = subtotal >= 500 ? 0 : 50
  const total = subtotal + shippingFee

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      // Create order
      const order = await createOrder.mutateAsync({
        items: items.map((item) => ({
          merchandise_id: item.merchandise_id,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
        })),
        shippingAddress,
      })

      // Initiate payment - the payment modal will be shown
      await checkout.mutateAsync(order.id)

      toast({ title: 'Order created! Redirecting to payment...' })
      navigate('/checkout/success')
    } catch (error) {
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to view your cart</h1>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Shopping Cart</h1>
          <p className="text-gray-400">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
      </div>

      <div className="container px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Your cart is empty</h3>
            <p className="text-gray-400 mb-6">Add some merchandise to get started</p>
            <Link to="/store">
              <Button>Browse Store</Button>
            </Link>
          </div>
        ) : step === 'cart' ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex gap-4">
                    <img
                      src={item.merchandise?.images?.[0] || '/placeholder-product.jpg'}
                      alt=""
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {item.merchandise?.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {formatPrice(item.merchandise?.price || 0)}
                      </p>
                      {item.size && (
                        <p className="text-xs text-gray-500">Size: {item.size}</p>
                      )}
                      {item.color && (
                        <p className="text-xs text-gray-500">Color: {item.color}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-white">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                  </div>
                  {shippingFee > 0 && (
                    <p className="text-xs text-green-500">
                      Add {formatPrice(500 - subtotal)} more for free shipping!
                    </p>
                  )}
                  <div className="border-t border-border pt-4 flex justify-between text-lg font-bold text-white">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <Button className="w-full" onClick={() => setStep('checkout')}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Full Name"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                    placeholder="John Doe"
                  />
                  <Input
                    label="Phone Number"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    placeholder="+260 XX XXX XXXX"
                  />
                  <Input
                    label="Address"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder="Lusaka"
                    />
                    <Input
                      label="Province"
                      value={shippingAddress.province}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                      placeholder="Lusaka Province"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep('cart')}>
                      Back to Cart
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCheckout}
                      isLoading={createOrder.isPending || checkout.isPending}
                    >
                      Pay {formatPrice(total)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.merchandise?.images?.[0] || '/placeholder-product.jpg'}
                        alt=""
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white truncate">
                          {item.merchandise?.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {item.quantity} x {formatPrice(item.merchandise?.price || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping</span>
                      <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
