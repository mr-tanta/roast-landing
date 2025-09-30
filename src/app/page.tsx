'use client'

import { useState } from 'react'
import { Flame, Zap, Target, TrendingUp } from 'lucide-react'
import { RoastForm } from '@/components/roast-form'
import { RoastDisplay } from '@/components/roast-display'
import { APIStatus } from '@/components/api-status'
import type { RoastResult } from '@/types'

export default function Home() {
  const [roastResult, setRoastResult] = useState<RoastResult | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              RoastMyLanding
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900">
              How it works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </a>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {!roastResult ? (
          <>
            {/* Hero Section */}
            <section className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Get brutally honest
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  landing page feedback
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                AI-powered roasting that actually helps you convert better. Know your score in 10
                seconds.
              </p>
              <RoastForm onRoastComplete={setRoastResult} />
            </section>

            {/* Features */}
            <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Instant Analysis</h3>
                <p className="text-gray-600">
                  Get your roast in seconds, not weeks. No complex setup required.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Actionable Insights</h3>
                <p className="text-gray-600">
                  Not just criticism – get specific fixes to improve your conversion rate.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Proven Methods</h3>
                <p className="text-gray-600">
                  Based on 50+ conversion optimization factors used by top SaaS companies.
                </p>
              </div>
            </section>

            {/* Social Proof */}
            <section className="text-center mb-16">
              <p className="text-gray-600 mb-4">Trusted by founders at</p>
              <div className="flex flex-wrap justify-center items-center gap-8 grayscale opacity-60">
                <span className="text-2xl font-bold">YC</span>
                <span className="text-2xl font-bold">Startup</span>
                <span className="text-2xl font-bold">Launch</span>
                <span className="text-2xl font-bold">Build</span>
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">Simple Pricing</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <p className="text-gray-600 mb-6">Perfect for trying it out</p>
                  <div className="text-4xl font-bold mb-6">
                    $0<span className="text-lg text-gray-600">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>3 roasts per day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Basic scoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Share cards</span>
                    </li>
                  </ul>
                  <button className="w-full py-3 border-2 border-gray-900 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Get Started Free
                  </button>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-8 text-white relative">
                  <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                    POPULAR
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <p className="opacity-90 mb-6">For serious optimizers</p>
                  <div className="text-4xl font-bold mb-6">
                    $29<span className="text-lg opacity-90">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <span>✓</span>
                      <span>Unlimited roasts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>✓</span>
                      <span>AI rewrite suggestions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>✓</span>
                      <span>Competitor analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>✓</span>
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <button className="w-full py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="mb-8 text-center">
              <button
                onClick={() => setRoastResult(null)}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Roast Another Page
              </button>
            </div>
            <RoastDisplay result={roastResult} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-600" />
                <span className="font-bold text-gray-900">RoastMyLanding</span>
              </div>
              <APIStatus className="ml-4" />
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-900">
                Terms
              </a>
              <a href="#" className="hover:text-gray-900">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
