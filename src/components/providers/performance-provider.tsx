'use client'

import { useEffect } from 'react'
import { initializePerformanceMonitoring } from '@/lib/monitoring/performance-monitor'
import { initializeBundleOptimization } from '@/lib/utils/bundle-optimization'
import { initializeServiceWorker } from '@/lib/utils/service-worker'

interface PerformanceProviderProps {
  children: React.ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Initialize performance monitoring
    initializePerformanceMonitoring()
    
    // Initialize bundle optimization
    initializeBundleOptimization()
    
    // Initialize service worker
    initializeServiceWorker()
    
    // Preload critical modules in the background
    import('@/lib/utils/dynamic-imports').then(({ preloadCriticalModules }) => {
      preloadCriticalModules()
    })
    
    console.log('Performance optimizations initialized')
  }, [])

  return <>{children}</>
}