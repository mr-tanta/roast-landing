'use client'

import { motion } from 'framer-motion'
import { Flame, Twitter, Linkedin, Copy, Check, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { RoastResult } from '@/types'

interface RoastDisplayProps {
  result: RoastResult
}

export function RoastDisplay({ result }: RoastDisplayProps) {
  const [copied, setCopied] = useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100'
    if (score >= 6) return 'text-yellow-600 bg-yellow-100'
    if (score >= 4) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Needs Work'
    return 'Critical'
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}?roast=${result.id}`

  const shareOnTwitter = () => {
    const text = `I got a ${result.score}/10 on @RoastMyLanding! ${result.roast.slice(0, 100)}...`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const copyShareCard = async () => {
    if (result.shareCardUrl) {
      try {
        await navigator.clipboard.writeText(result.shareCardUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
        // Fallback: show URL in alert
        alert(`Share card URL: ${result.shareCardUrl}`)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-8"
    >
      {/* Score Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Roast Score</h2>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreColor(result.score)}`}
          >
            <div className="text-center">
              <div className="text-4xl font-bold">{result.score}</div>
              <div className="text-xs">/10</div>
            </div>
          </motion.div>
        </div>

        <p className="text-lg text-gray-700 font-medium mb-4">{getScoreLabel(result.score)}</p>

        {/* Roast Text */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Flame className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <p className="text-lg text-gray-900 leading-relaxed">{result.roast}</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(result.breakdown).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{value}/2</div>
              <div className="text-sm text-gray-600 capitalize">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues Section */}
      {result.issues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            Top Issues Found
          </h3>
          <div className="space-y-4">
            {result.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  issue.impact === 'high'
                    ? 'bg-red-50 border-red-500'
                    : issue.impact === 'medium'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{issue.issue}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      issue.impact === 'high'
                        ? 'bg-red-200 text-red-800'
                        : issue.impact === 'medium'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {issue.impact}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Location:</span> {issue.location}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Fix:</span> {issue.fix}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {result.quickWins.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Wins 🚀</h3>
          <ul className="space-y-3">
            {result.quickWins.map((win, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                  ✓
                </span>
                <span className="text-gray-700">{win}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screenshots */}
      {result.desktopScreenshotUrl && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Page Screenshot</h3>
          <div className="rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={result.desktopScreenshotUrl}
              alt="Landing page screenshot"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Share Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-4 text-center">Share Your Roast</h3>
        <p className="text-center mb-6 opacity-90">
          Challenge your friends to get a better score!
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={shareOnTwitter}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Twitter className="w-5 h-5" />
            Share on Twitter
          </button>
          <button
            onClick={shareOnLinkedIn}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Linkedin className="w-5 h-5" />
            Share on LinkedIn
          </button>
          <button
            onClick={copyShareCard}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Share Card
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}