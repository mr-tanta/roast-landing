'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { CheckCircle, XCircle, Globe, Server } from 'lucide-react'

interface APIStatusProps {
  showDetails?: boolean
  className?: string
}

export function APIStatus({ showDetails = false, className = '' }: APIStatusProps) {
  const [apiInfo, setApiInfo] = useState(apiClient.getAPIInfo())
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'error'>('checking')
  const [healthMessage, setHealthMessage] = useState<string>('')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.healthCheck()
        if (response.error) {
          setHealthStatus('error')
          setHealthMessage(response.error)
        } else {
          setHealthStatus('healthy')
          setHealthMessage('API is responding')
        }
      } catch (error) {
        setHealthStatus('error')
        setHealthMessage('Health check failed')
      }
    }

    checkHealth()
  }, [])

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getModeIcon = () => {
    return apiInfo.useExternal ? (
      <Globe className="w-4 h-4 text-blue-500" />
    ) : (
      <Server className="w-4 h-4 text-gray-500" />
    )
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {getStatusIcon()}
        <span className="text-gray-600">{apiInfo.mode}</span>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {getModeIcon()}
        <h3 className="text-sm font-medium text-gray-900">API Status</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Mode:</span>
          <span className="font-medium">{apiInfo.mode}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Health:</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={healthStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}>
              {healthStatus === 'checking' ? 'Checking...' : healthMessage}
            </span>
          </div>
        </div>
        
        {apiInfo.useExternal && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Endpoint:</span>
            <span className="font-mono text-xs text-blue-600 break-all">
              {apiInfo.baseUrl}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}