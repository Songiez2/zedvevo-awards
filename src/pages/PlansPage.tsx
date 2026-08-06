import { Link } from 'react-router-dom'
import { ARTIST_PLANS } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { formatPrice } from '@/utils'

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-electric-blue/10 to-transparent py-16">
      <div className="container px-4">
        <h1 className="text-4xl font-bold text-white text-center mb-4">Choose Your Plan</h1>
        <p className="text-gray-400 text-center mb-12">Select the perfect plan for your music career</p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {Object.entries(ARTIST_PLANS).map(([key, plan]) => (
            <Card key={key}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span>
                </div>
                <ul className="space-y-3 text-left mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300">
                      <Check className="h-5 w-5 text-electric" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={`/artist/become?plan=${key}`}>
                  <Button className="w-full">Select Plan</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
