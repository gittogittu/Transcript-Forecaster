'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Users, 
  Calendar,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react'
import { TranscriptData } from '@/types/transcript'

interface SummaryStatisticsProps {
  data: TranscriptData[]
  timeRange?: string
  selectedClients?: string[]
}

interface StatisticCard {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description?: string
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export function SummaryStatistics({ data, timeRange, selectedClients }: SummaryStatisticsProps) {
  // Calculate statistics
  const statistics = React.useMemo(() => {
    if (!data.length) {
      return {
        totalTranscripts: 0,
        totalClients: 0,
        averagePerMonth: 0,
        averagePerClient: 0,
        growthRate: 0,
        topClient: null,
        topClientCount: 0,
        monthlyTrend: [],
        clientDistribution: []
      }
    }

    const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)
    const uniqueClients = new Set(data.map(item => item.clientName))
    const totalClients = uniqueClients.size

    // Monthly calculations
    const monthlyData = new Map<string, number>()
    data.forEach(item => {
      const monthKey = `${item.year}-${item.month.padStart(2, '0')}`
      const current = monthlyData.get(monthKey) || 0
      monthlyData.set(monthKey, current + item.transcriptCount)
    })

    const averagePerMonth = monthlyData.size > 0 ? totalTranscripts / monthlyData.size : 0
    const averagePerClient = totalClients > 0 ? totalTranscripts / totalClients : 0

    // Growth rate calculation
    const sortedMonths = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b))
    let growthRate = 0
    
    if (sortedMonths.length >= 2) {
      const firstMonth = sortedMonths[0][1]
      const lastMonth = sortedMonths[sortedMonths.length - 1][1]
      if (firstMonth > 0) {
        growthRate = ((lastMonth - firstMonth) / firstMonth) * 100
      }
    }

    // Top client
    const clientTotals = new Map<string, number>()
    data.forEach(item => {
      const current = clientTotals.get(item.clientName) || 0
      clientTotals.set(item.clientName, current + item.transcriptCount)
    })

    let topClient = null
    let topClientCount = 0
    for (const [client, count] of clientTotals) {
      if (count > topClientCount) {
        topClient = client
        topClientCount = count
      }
    }

    // Monthly trend for last 6 months
    const monthlyTrend = sortedMonths.slice(-6).map(([month, count]) => ({
      month,
      count,
      formatted: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }))

    // Client distribution
    const clientDistribution = Array.from(clientTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([client, count]) => ({
        client,
        count,
        percentage: (count / totalTranscripts) * 100
      }))

    return {
      totalTranscripts,
      totalClients,
      averagePerMonth: Math.round(averagePerMonth),
      averagePerClient: Math.round(averagePerClient),
      growthRate: Math.round(growthRate * 100) / 100,
      topClient,
      topClientCount,
      monthlyTrend,
      clientDistribution
    }
  }, [data])

  // Generate insights
  const insights = React.useMemo((): Insight[] => {
    const insights: Insight[] = []

    // Growth insights
    if (statistics.growthRate > 10) {
      insights.push({
        type: 'positive',
        title: 'Strong Growth Trend',
        description: `Transcript volume has increased by ${statistics.growthRate}% over the selected period, indicating strong business growth.`,
        icon: TrendingUp
      })
    } else if (statistics.growthRate < -10) {
      insights.push({
        type: 'negative',
        title: 'Declining Volume',
        description: `Transcript volume has decreased by ${Math.abs(statistics.growthRate)}% over the selected period. Consider investigating potential causes.`,
        icon: TrendingDown
      })
    } else if (Math.abs(statistics.growthRate) <= 5) {
      insights.push({
        type: 'neutral',
        title: 'Stable Volume',
        description: `Transcript volume has remained relatively stable with ${statistics.growthRate}% change over the selected period.`,
        icon: Target
      })
    }

    // Client concentration insights
    if (statistics.clientDistribution.length > 0) {
      const topClientPercentage = statistics.clientDistribution[0].percentage
      if (topClientPercentage > 50) {
        insights.push({
          type: 'warning',
          title: 'High Client Concentration',
          description: `${statistics.topClient} represents ${topClientPercentage.toFixed(1)}% of your total volume. Consider diversifying your client base.`,
          icon: AlertTriangle
        })
      } else if (topClientPercentage < 20 && statistics.totalClients > 5) {
        insights.push({
          type: 'positive',
          title: 'Well-Diversified Portfolio',
          description: `Your client base is well-diversified with no single client dominating your transcript volume.`,
          icon: Award
        })
      }
    }

    // Volume insights
    if (statistics.averagePerMonth > 100) {
      insights.push({
        type: 'positive',
        title: 'High Volume Processing',
        description: `You're processing an average of ${statistics.averagePerMonth} transcripts per month, indicating strong operational capacity.`,
        icon: BarChart3
      })
    }

    // Trend insights
    if (statistics.monthlyTrend.length >= 3) {
      const recentTrend = statistics.monthlyTrend.slice(-3)
      const isIncreasing = recentTrend.every((month, index) => 
        index === 0 || month.count >= recentTrend[index - 1].count
      )
      const isDecreasing = recentTrend.every((month, index) => 
        index === 0 || month.count <= recentTrend[index - 1].count
      )

      if (isIncreasing && !isDecreasing) {
        insights.push({
          type: 'positive',
          title: 'Consistent Growth',
          description: 'Your transcript volume has been consistently increasing over the last 3 months.',
          icon: TrendingUp
        })
      } else if (isDecreasing && !isIncreasing) {
        insights.push({
          type: 'warning',
          title: 'Recent Decline',
          description: 'Your transcript volume has been declining over the last 3 months. Consider reviewing your pipeline.',
          icon: TrendingDown
        })
      }
    }

    return insights
  }, [statistics])

  // Create statistic cards
  const statisticCards: StatisticCard[] = [
    {
      title: 'Total Transcripts',
      value: statistics.totalTranscripts.toLocaleString(),
      icon: BarChart3,
      color: 'text-blue-600',
      description: 'Total transcripts in selected period'
    },
    {
      title: 'Active Clients',
      value: statistics.totalClients,
      icon: Users,
      color: 'text-green-600',
      description: 'Unique clients with transcript activity'
    },
    {
      title: 'Monthly Average',
      value: statistics.averagePerMonth,
      icon: Calendar,
      color: 'text-purple-600',
      description: 'Average transcripts processed per month'
    },
    {
      title: 'Growth Rate',
      value: `${statistics.growthRate > 0 ? '+' : ''}${statistics.growthRate}%`,
      change: statistics.growthRate,
      icon: statistics.growthRate >= 0 ? TrendingUp : TrendingDown,
      color: statistics.growthRate >= 0 ? 'text-green-600' : 'text-red-600',
      description: 'Period-over-period growth rate'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statisticCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.title} variants={itemVariants}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      {stat.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.description}
                        </p>
                      )}
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Key Insights */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Insights
            </CardTitle>
            <CardDescription>
              Automated analysis of your transcript data patterns and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight, index) => {
                  const Icon = insight.icon
                  const colorClasses = {
                    positive: 'bg-green-50 border-green-200 text-green-800',
                    negative: 'bg-red-50 border-red-200 text-red-800',
                    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                    neutral: 'bg-blue-50 border-blue-200 text-blue-800'
                  }
                  
                  const iconColorClasses = {
                    positive: 'text-green-600',
                    negative: 'text-red-600',
                    warning: 'text-yellow-600',
                    neutral: 'text-blue-600'
                  }

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${colorClasses[insight.type]}`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 ${iconColorClasses[insight.type]}`} />
                      <div>
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm">{insight.description}</p>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available with current data selection</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Clients */}
      {statistics.clientDistribution.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Clients
              </CardTitle>
              <CardDescription>
                Clients with highest transcript volume in selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.clientDistribution.map((client, index) => (
                  <div key={client.client} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{client.client}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{client.count.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Monthly Trend */}
      {statistics.monthlyTrend.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Trend
              </CardTitle>
              <CardDescription>
                Monthly transcript volume over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-32">
                {statistics.monthlyTrend.map((month, index) => {
                  const maxCount = Math.max(...statistics.monthlyTrend.map(m => m.count))
                  const height = maxCount > 0 ? (month.count / maxCount) * 100 : 0
                  
                  return (
                    <div key={month.month} className="flex flex-col items-center flex-1">
                      <div className="text-xs font-medium mb-1">{month.count}</div>
                      <motion.div
                        className="bg-blue-500 rounded-t w-full min-h-[4px]"
                        style={{ height: `${height}%` }}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        {month.formatted}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}