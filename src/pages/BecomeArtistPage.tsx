import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ARTIST_PLANS } from '@/constants'
import { lipilaService, detectNetwork } from '@/services/lipila'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Check, Zap, Crown, Star, Phone, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/utils'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/authStore'

const planIcons = {
  daily: Zap,
  weekly: Star,
  annual: Crown,
}

export default function BecomeArtistPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuthStore()
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'daily' | 'weekly' | 'annual' | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const handleSelectPlan = (planType: 'daily' | 'weekly' | 'annual') => {
    if (!isAuthenticated) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to purchase a plan',
        variant: 'destructive',
      })
      navigate('/login')
      return
    }
    setSelectedPlan(planType)
    setPhoneNumber('')
    setPaymentStatus('idle')
    setStatusMessage('')
    setPaymentId(null)
    setShowPaymentModal(true)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.startsWith('0')) {
      value = '260' + value.substring(1)
    }
    if (!value.startsWith('260')) {
      value = value
    }
    setPhoneNumber(value)
  }

  const handlePayment = async () => {
    if (!selectedPlan || !phoneNumber) return

    const network = detectNetwork(phoneNumber)
    if (!network) {
      toast({
        title: 'Invalid phone number',
        description: 'Please use a valid MTN (076, 095, 096) or Airtel (077, 078, 079) number',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setPaymentStatus('pending')
    setStatusMessage(`Processing ${network.toUpperCase()} payment...`)

    try {
      const result = await lipilaService.purchaseArtistPlan(selectedPlan, phoneNumber)

      if (!result.success) {
        setPaymentStatus('failed')
        setStatusMessage(result.error || 'Payment failed. Please try again.')
        toast({
          title: 'Payment Failed',
          description: result.error || 'Please check your phone number and try again.',
          variant: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      setPaymentId(result.paymentId || null)
      
      if (result.status === 'completed') {
        setPaymentStatus('success')
        setStatusMessage('Payment successful! Your artist account is now active.')
        toast({
          title: 'Congratulations! 🎉',
          description: 'Your artist account has been activated. You can now upload music!',
        })
        setTimeout(() => {
          setShowPaymentModal(false)
          navigate('/artist')
        }, 2000)
      } else {
        setStatusMessage(result.message || 'Payment request sent! Please check your phone and enter your PIN to confirm.')
        toast({
          title: 'Payment Pending',
          description: 'Please check your phone and enter your PIN to confirm the payment.',
        })
        
        // Poll for payment status
        if (result.paymentId) {
          pollPaymentStatus(result.paymentId)
        }
      }
    } catch (error) {
      setPaymentStatus('failed')
      setStatusMessage('An error occurred. Please try again.')
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus('failed')
        setStatusMessage('Payment verification timed out. Please check your phone and try again.')
        return
      }

      const result = await lipilaService.checkPaymentStatus(paymentId)
      
      if (result.status === 'completed') {
        setPaymentStatus('success')
        setStatusMessage('Payment successful! Your artist account is now active.')
        toast({
          title: 'Congratulations! 🎉',
          description: 'Your artist account has been activated. You can now upload music!',
        })
        setTimeout(() => {
          setShowPaymentModal(false)
          navigate('/artist')
        }, 2000)
        return
      }

      if (result.status === 'failed') {
        setPaymentStatus('failed')
        setStatusMessage('Payment was rejected or failed. Please try again.')
        toast({
          title: 'Payment Failed',
          description: 'The payment was rejected. Please try again.',
          variant: 'destructive',
        })
        return
      }

      attempts++
      setTimeout(poll, 3000)
    }

    poll()
  }

  const handleRetry = () => {
    setPaymentStatus('idle')
    setStatusMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-electric-blue/10 to-transparent">
      <div className="container px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Become an Artist
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start uploading your music, selling merchandise, and connecting with fans on ZedVevo
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {(Object.entries(ARTIST_PLANS) as [keyof typeof ARTIST_PLANS, typeof ARTIST_PLANS[keyof typeof ARTIST_PLANS]][]).map(([key, plan]) => {
            const Icon = planIcons[key]
            const isPopular = key === 'weekly'

            return (
              <Card
                key={key}
                className={`relative ${isPopular ? 'border-electric shadow-glow' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-electric text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <Icon className="h-12 w-12 text-electric mx-auto mb-4" />
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.durationUnit} Access</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                  <ul className="space-y-3 text-left mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-gray-300">
                        <Check className="h-5 w-5 text-electric flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(key)}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12 text-gray-400">
          <p>Already have an artist account?</p>
          <Link to="/artist" className="text-electric hover:underline">
            Go to Artist Dashboard
          </Link>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? `${ARTIST_PLANS[selectedPlan].name} Plan` : 'Payment'}
            </DialogTitle>
            <DialogDescription>
              Pay with Mobile Money (MTN or Airtel)
            </DialogDescription>
          </DialogHeader>

          {paymentStatus === 'idle' && (
            <div className="space-y-4">
              <div className="bg-electric/10 rounded-lg p-4 text-center">
                <p className="text-electric font-semibold text-lg">
                  {formatPrice(selectedPlan ? ARTIST_PLANS[selectedPlan].price : 0)}
                </p>
                <p className="text-gray-400 text-sm">Total Amount</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Mobile Money Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="260XXXXXXXXX"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  leftIcon={<Phone className="h-4 w-4" />}
                  className="w-full"
                />
                {phoneNumber && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {detectNetwork(phoneNumber) ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">
                          Valid {detectNetwork(phoneNumber)?.toUpperCase()} number
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">
                          Invalid. Use MTN (076/095/096) or Airtel (077/078/079)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-mid-gray/50 rounded-lg p-3 text-sm text-gray-400">
                <p className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500">⚠️</span>
                  <span>How to pay:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Enter your mobile money phone number</li>
                  <li>Click "Pay Now" button</li>
                  <li>You will receive an SMS on your phone</li>
                  <li>Enter your PIN to confirm the payment</li>
                  <li>Wait for confirmation</li>
                </ol>
              </div>

              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={!phoneNumber || !detectNetwork(phoneNumber)}
              >
                <Phone className="mr-2 h-4 w-4" />
                Pay Now
              </Button>
            </div>
          )}

          {paymentStatus === 'pending' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-electric mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-white mb-2">Processing Payment</h3>
              <p className="text-gray-400 mb-4">{statusMessage}</p>
              <div className="bg-mid-gray/50 rounded-lg p-4 text-sm text-gray-300">
                <p>⏳ Please wait...</p>
                <p className="mt-2">If you haven't received an SMS, please check your phone and enter your PIN to confirm.</p>
              </div>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Payment Successful!</h3>
              <p className="text-gray-400">{statusMessage}</p>
              <p className="text-electric mt-4">Redirecting to your dashboard...</p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Payment Failed</h3>
              <p className="text-gray-400 mb-6">{statusMessage}</p>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
