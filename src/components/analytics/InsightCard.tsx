'use client'

import { BusinessInsight } from '@/lib/services/insight-generation/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  AlertTriangle, 
  Activity,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface InsightCardProps {
  insight: BusinessInsight
  onViewDetails?: (insight: BusinessInsight) => void
}

export function InsightCard({ insight, onViewDetails }: InsightCardProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />
      case 'seasonal':
        return <Calendar className="h-4 w-4" />
      case 'pattern':
        return <BarChart3 className="h-4 w-4" />
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />
      case 'correlation':
        return <Activity className="h-4 w-4" />
      case 'forecast':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetails?.(insight)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getInsightIcon(insight.type)}
            <CardTitle className="text-lg">{insight.title}</CardTitle>
          </div>
          <Badge variant={getImpactColor(insight.impact) as any}>
            {insight.impact}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {insight.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Confidence</span>
            <span className={`text-sm font-semibold ${getConfidenceColor(insight.confidence)}`}>
              {(insight.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={insight.confidence * 100} 
            className="h-2"
          />
        </div>

        {/* Timeframe */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {format(insight.timeframe.startDate, 'MMM dd')} - {format(insight.timeframe.endDate, 'MMM dd, yyyy')}
          </span>
        </div>

        {/* Supporting Metrics */}
        {insight.supportingData?.metrics && Object.keys(insight.supportingData.metrics).length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium">Key Metrics</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(insight.supportingData.metrics).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-medium">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Recommendations (if present in supportingData.metadata or visualizations config) */}
        {Array.isArray((insight as any).recommendations) && (insight as any).recommendations.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Recommendations</span>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
              {(insight as any).recommendations.slice(0, 3).map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Type Badge */}
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-xs">
            {insight.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(insight.createdAt, 'MMM dd, HH:mm')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}