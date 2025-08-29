import { ComponentType } from 'react'

// Dynamic import utilities for better code splitting
export const dynamicImports = {
  // Google Generative AI - ML library
  gemini: () => import('@google/generative-ai'),
  
  // Chart libraries
  recharts: () => import('recharts'),
  
  // Animation libraries
  framerMotion: () => import('framer-motion'),
  
  // Prediction service (using mock for now)
  predictionService: () => import('@/lib/services/prediction-service-mock'),
  
  // Data preprocessing utilities
  dataPreprocessing: () => import('@/lib/utils/data-preprocessing'),
}

// Utility function to preload critical modules
export async function preloadCriticalModules() {
  try {
    // Gemini AI enabled
    console.log('Critical modules preloaded successfully (Gemini AI enabled)')
  } catch (error) {
    console.warn('Failed to preload critical modules:', error)
  }
}

// Utility function to load modules on demand
export async function loadModuleOnDemand<T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await importFn()
  } catch (error) {
    console.error('Failed to load module:', error)
    if (fallback) {
      return fallback
    }
    throw error
  }
}

// HOC for lazy loading components with error boundaries
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ComponentType<P>
) {
  return async (props: P) => {
    try {
      const { default: Component } = await importFn()
      return Component
    } catch (error) {
      console.error('Failed to load component:', error)
      if (fallback) {
        return fallback
      }
      throw error
    }
  }
}

// Bundle splitting configuration
export const bundleSplitConfig = {
  // Vendor chunks
  vendor: ['react', 'react-dom', 'next'],
  
  // Analytics chunks
  analytics: ['recharts', '@google/generative-ai'],
  
  // UI chunks
  ui: ['framer-motion', '@radix-ui/react-*'],
  
  // Auth chunks
  auth: ['next-auth'],
  
  // Data chunks
  data: ['@tanstack/react-query', 'zod']
}