"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Calendar,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard, CardSkeleton } from "@/components/animations"

interface MetricCardData {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  description?: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

interface MetricsCardsProps {
  metrics?: MetricCardData[]
  loading?: boolean
}

const defaultMetrics: MetricCardData[] = [
  {
    title: "Total Transcripts",
    value: "2,847",
    change: {
      value: 12.5,
      type: 'increase',
      period: 'vs last month'
    },
    icon: FileText,
    description: "Total transcripts processed",
    color: 'blue'
  },
  {
    title: "Active Clients",
    value: "24",
    change: {
      value: 2,
      type: 'increase',
      period: 'new this month'
    },
    icon: Users,
    description: "Clients with recent activity",
    color: 'green'
  },
  {
    title: "This Month",
    value: "387",
    change: {
      value: 8.2,
      type: 'decrease',
      period: 'vs last month'
    },
    icon: Calendar,
    description: "Transcripts this month",
    color: 'purple'
  },
  {
    title: "Avg per Client",
    value: "16.1",
    change: {
      value: 5.4,
      type: 'increase',
      period: 'vs last month'
    },
    icon: BarChart3,
    description: "Average transcripts per client",
    color: 'orange'
  }
]

const colorVariants = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600", 
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600"
}

function MetricCard({ metric, index }: { metric: MetricCardData; index: number }) {
  const Icon = metric.icon
  const isIncrease = metric.change?.type === 'increase'
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Gradient background */}
        <div className={cn(
          "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
          colorVariants[metric.color || 'blue']
        )} />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </CardTitle>
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-r",
            colorVariants[metric.color || 'blue']
          )}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <motion.div 
              className="text-2xl font-bold"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
            >
              {metric.value}
            </motion.div>
            
            {metric.change && (
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={isIncrease ? "default" : "secondary"}
                  className={cn(
                    "flex items-center space-x-1 text-xs",
                    isIncrease 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(metric.change.value)}%</span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {metric.change.period}
                </span>
              </div>
            )}
            
            {metric.description && (
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MetricCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="flex items-center space-x-2">
              <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function MetricsCards({ metrics = defaultMetrics, loading = false }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} index={index} />
        ))
      ) : (
        metrics.map((metric, index) => (
          <MetricCard key={metric.title} metric={metric} index={index} />
        ))
      )}
    </div>
  )
}