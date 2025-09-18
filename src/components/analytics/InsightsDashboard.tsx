'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InsightCard } from './InsightCard'
import { RecommendationCard } from './RecommendationCard'
import { 
  BusinessInsight, 
  Recommendation, 
  InsightGenerationResult,
  InsightGenerationRequest 
} from '@/lib/services/insight-generation/types'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  RefreshCw,
  Filter,
  Download,
  Calendar
} from 'lucide-react'
import { format, subDays } from 'date-fns'

interface InsightsDashboardProps {
  clientId?: string
  initialData?: InsightGenerationResult
}

export function InsightsDashboard({ clientId, initialData }: InsightsDashboardProps) {
  const [insights, setInsights] = useState<BusinessInsight[]>(initialData?.insights || [])
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialData?.recommendations || [])
  const [summary, setSummary] = useState<string>(initialData?.summary || '')
  const [confidence, setConfidence] = useState<number>(initialData?.confidence || 0)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('30d')
  const [insightFilter, setInsightFilter] = useState('all')
  const [recommendationFilter, setRecommendationFilter] = useState('all')

  const generateInsights = async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const days = parseInt(timeRange.replace('d', ''))
      const endDate = new Date()
      const startDate = subDays(endDate, days)

      const request: InsightGenerationRequest = {
        clientId,
        timeRange: { startDate, endDate },
        dataTypes: ['transcripts'],
        analysisDepth: 'detailed',
        includeRecommendations: true
      }

      const response = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) throw new Error('Failed to generate insights')

      const result = await response.json()
      if (result.success) {
        setInsights(result.data.insights)
        setRecommendations(result.data.recommendations)
        setSummary(result.data.summary)
        setConfidence(result.data.confidence)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId && !initialData) {
      generateInsights()
    }
  }, [clientId, timeRange])

  const filteredInsights = insights.filter(insight => {
    if (insightFilter === 'all') return true
    return insight.type === insightFilter
  })

  const filteredRecommendations = recommendations.filter(rec => {
    if (recommendationFilter === 'all') return true
    if (recommendationFilter === 'priority') return rec.priority === 'high' || rec.priority === 'critical'
    return rec.status === recommendationFilter
  })

  const insightStats = {
    total: insights.length,
    critical: insights.filter(i => i.impact === 'critical').length,
    high: insights.filter(i => i.impact === 'high').length,
    trends: insights.filter(i => i.type === 'trend').length,
    anomalies: insights.filter(i => i.type === 'anomaly').length
  }

  const recommendationStats = {
    total: recommendations.length,
    critical: recommendations.filter(r => r.priority === 'critical').length,
    high: recommendations.filter(r => r.priority === 'high').length,
    pending: recommendations.filter(r => r.status === 'pending').length
  }

  const handleAcceptRecommendation = async (recommendation: Recommendation) => {
    // Update recommendation status
    const updatedRecommendations = recommendations.map(r => 
      r.id === recommendation.id 
        ? { ...r, status: 'in_progress' as const }
        : r
    )
    setRecommendations(updatedRecommendations)
  }

  const handleDismissRecommendation = async (recommendation: Recommendation) => {
    // Update recommendation status
    const updatedRecommendations = recommendations.map(r => 
      r.id === recommendation.id 
        ? { ...r, status: 'dismissed' as const }
        : r
    )
    setRecommendations(updatedRecommendations)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            AI Insights Dashboard
          </h1>
          <p className="text-muted-foreground">
            Automated insights and recommendations powered by advanced analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateInsights} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Executive Summary
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Overall Confidence: {(confidence * 100).toFixed(0)}%
              </Badge>
              <Badge variant="outline">
                {insights.length} Insights
              </Badge>
              <Badge variant="outline">
                {recommendations.length} Recommendations
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {insightStats.critical} Critical
              </Badge>
              <Badge variant="default" className="text-xs">
                {insightStats.high} High
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendationStats.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {recommendationStats.critical} Critical
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {recommendationStats.pending} Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trends Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.trends}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Pattern analysis complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.anomalies}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Business Insights</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={insightFilter} onValueChange={setInsightFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trend">Trends</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="anomaly">Anomalies</SelectItem>
                  <SelectItem value="correlation">Correlations</SelectItem>
                  <SelectItem value="forecast">Forecasts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewDetails={(insight) => {
                  console.log('View insight details:', insight)
                }}
              />
            ))}
          </div>

          {filteredInsights.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No insights found for the selected filter.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recommendations</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="priority">High Priority</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onAccept={handleAcceptRecommendation}
                onDismiss={handleDismissRecommendation}
                onViewDetails={(rec) => {
                  console.log('View recommendation details:', rec)
                }}
              />
            ))}
          </div>

          {filteredRecommendations.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No recommendations found for the selected filter.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}