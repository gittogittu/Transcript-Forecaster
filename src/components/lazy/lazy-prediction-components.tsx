'use client'

import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/animations/loading-spinner'

// Lazy load prediction components for better performance
export const LazyPredictionChart = lazy(() => 
  import('@/components/analytics/prediction-chart').then(module => ({
    default: module.PredictionChart
  }))
)

export const LazyTrendChart = lazy(() => 
  import('@/components/analytics/trend-chart').then(module => ({
    default: module.TrendChart
  }))
)

export const LazyInteractiveChart = lazy(() => 
  import('@/components/analytics/interactive-chart').then(module => ({
    default: module.InteractiveChart
  }))
)

export const LazyPredictionService = lazy(() => 
  import('@/lib/services/prediction-service').then(module => ({
    default: module.PredictionService
  }))
)

// Wrapper components with Suspense boundaries
interface LazyComponentWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyComponentWrapper({ 
  children, 
  fallback = <LoadingSpinner size="lg" /> 
}: LazyComponentWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}

// Specific wrappers for each component
export function PredictionChartWrapper(props: any) {
  return (
    <LazyComponentWrapper fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>}>
      <LazyPredictionChart {...props} />
    </LazyComponentWrapper>
  )
}

export function TrendChartWrapper(props: any) {
  return (
    <LazyComponentWrapper fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>}>
      <LazyTrendChart {...props} />
    </LazyComponentWrapper>
  )
}

export function InteractiveChartWrapper(props: any) {
  return (
    <LazyComponentWrapper fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>}>
      <LazyInteractiveChart {...props} />
    </LazyComponentWrapper>
  )
}