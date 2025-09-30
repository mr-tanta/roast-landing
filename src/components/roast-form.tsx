'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Flame, Loader2 } from 'lucide-react'
import { generateRoast } from '@/lib/api-client'
import type { RoastResult } from '@/types'

const roastSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

type RoastFormData = z.infer<typeof roastSchema>

interface RoastFormProps {
  onRoastComplete: (result: RoastResult) => void
}

export function RoastForm({ onRoastComplete }: RoastFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoastFormData>()

  const onSubmit = async (data: RoastFormData) => {
    setIsLoading(true)
    setError(null)

    const toastId = toast.loading('Roasting your landing page...')

    try {
      const response = await generateRoast({ url: data.url })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data) {
        throw new Error('No data received from API')
      }

      toast.success('Roast complete!', { id: toastId })
      onRoastComplete(response.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <input
            {...register('url')}
            type="text"
            placeholder="https://yourlandingpage.com"
            disabled={isLoading}
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          {errors.url && (
            <p className="mt-2 text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-8 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Roasting your page...
            </>
          ) : (
            <>
              <Flame className="w-6 h-6" />
              Roast My Landing Page
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </form>

      {isLoading && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <p>Capturing screenshots...</p>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-150" />
            <p>Analyzing with AI...</p>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-300" />
            <p>Preparing your roast...</p>
          </div>
        </div>
      )}
    </div>
  )
}