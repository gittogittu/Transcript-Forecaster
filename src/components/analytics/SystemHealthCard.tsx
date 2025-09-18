'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LucideIcon } from 'lucide-react'

interface SystemHealthCardProps {
  title: string
  status: 'healthy' | 'degraded' | 'critical'
  latency?: number
  icon: LucideIcon
  uptime?: number
  errorRate?: number
}

export function SystemHealthCard({ 
  title, 
  status, 
  latency, 
  icon: Icon, 
  uptime, 
  errorRate 
}: SystemHealthCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default' as const
      case 'degraded':
        return 'secondary' as const
      case 'critical':
        return 'destructive' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
        </div>
        
        <div className="space-y-2">
          <Badge variant={getStatusVariant(status)} className="text-xs">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          
          {latency !== undefined && (
            <div className="text-xs text-muted-foreground">
              Latency: {latency}ms
            </div>
          )}
          
          {uptime !== undefined && (
            <div className="text-xs text-muted-foreground">
              Uptime: {uptime.toFixed(1)}%
            </div>
          )}
          
          {errorRate !== undefined && (
            <div className="text-xs text-muted-foreground">
              Error Rate: {errorRate.toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}