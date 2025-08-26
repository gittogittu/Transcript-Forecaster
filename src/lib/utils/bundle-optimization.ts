// Bundle optimization utilities
export const optimizedImports = {
  // Optimized Radix UI imports
  avatar: () => import('@radix-ui/react-avatar').then(mod => mod),
  label: () => import('@radix-ui/react-label').then(mod => mod),
  select: () => import('@radix-ui/react-select').then(mod => mod),
  separator: () => import('@radix-ui/react-separator').then(mod => mod),
  slot: () => import('@radix-ui/react-slot').then(mod => mod),
  tabs: () => import('@radix-ui/react-tabs').then(mod => mod),
  
  // Optimized Lucide React imports
  icons: {
    ChevronDown: () => import('lucide-react').then(mod => mod.ChevronDown),
    User: () => import('lucide-react').then(mod => mod.User),
    Settings: () => import('lucide-react').then(mod => mod.Settings),
    BarChart: () => import('lucide-react').then(mod => mod.BarChart),
    TrendingUp: () => import('lucide-react').then(mod => mod.TrendingUp),
    Activity: () => import('lucide-react').then(mod => mod.Activity),
    Download: () => import('lucide-react').then(mod => mod.Download),
    Upload: () => import('lucide-react').then(mod => mod.Upload),
    RefreshCw: () => import('lucide-react').then(mod => mod.RefreshCw),
    AlertCircle: () => import('lucide-react').then(mod => mod.AlertCircle),
    CheckCircle: () => import('lucide-react').then(mod => mod.CheckCircle),
    XCircle: () => import('lucide-react').then(mod => mod.XCircle),
    Loader2: () => import('lucide-react').then(mod => mod.Loader2),
  },
  
  // Optimized Recharts imports
  charts: {
    LineChart: () => import('recharts').then(mod => mod.LineChart),
    BarChart: () => import('recharts').then(mod => mod.BarChart),
    AreaChart: () => import('recharts').then(mod => mod.AreaChart),
    XAxis: () => import('recharts').then(mod => mod.XAxis),
    YAxis: () => import('recharts').then(mod => mod.YAxis),
    CartesianGrid: () => import('recharts').then(mod => mod.CartesianGrid),
    Tooltip: () => import('recharts').then(mod => mod.Tooltip),
    Legend: () => import('recharts').then(mod => mod.Legend),
    ResponsiveContainer: () => import('recharts').then(mod => mod.ResponsiveContainer),
    Line: () => import('recharts').then(mod => mod.Line),
    Bar: () => import('recharts').then(mod => mod.Bar),
    Area: () => import('recharts').then(mod => mod.Area),
  },
  
  // Optimized TensorFlow.js imports (commented out until TensorFlow is reinstalled)
  // tensorflow: {
  //   core: () => import('@tensorflow/tfjs-core'),
  //   layers: () => import('@tensorflow/tfjs-layers'),
  //   converter: () => import('@tensorflow/tfjs-converter'),
  //   data: () => import('@tensorflow/tfjs-data'),
  // },
  
  // Optimized Framer Motion imports
  motion: {
    motion: () => import('framer-motion').then(mod => ({ motion: mod.motion })),
    AnimatePresence: () => import('framer-motion').then(mod => ({ AnimatePresence: mod.AnimatePresence })),
    useAnimation: () => import('framer-motion').then(mod => ({ useAnimation: mod.useAnimation })),
    useInView: () => import('framer-motion').then(mod => ({ useInView: mod.useInView })),
  }
}

// Tree shaking configuration for different libraries
export const treeShakingConfig = {
  // Libraries that support tree shaking
  treeShakeable: [
    'lodash-es',
    'date-fns',
    'ramda',
    // '@tensorflow/tfjs-core',
    'recharts/es6',
    'lucide-react/dist/esm'
  ],
  
  // Libraries that need special handling
  sideEffectFree: [
    'clsx',
    'class-variance-authority',
    'tailwind-merge'
  ],
  
  // Libraries with side effects
  sideEffects: [
    // '@tensorflow/tfjs',
    'next-auth',
    'framer-motion'
  ]
}

// Bundle size monitoring
export interface BundleStats {
  totalSize: number
  gzippedSize: number
  chunks: {
    name: string
    size: number
    modules: string[]
  }[]
  assets: {
    name: string
    size: number
    type: 'js' | 'css' | 'image' | 'font' | 'other'
  }[]
}

export class BundleAnalyzer {
  private static instance: BundleAnalyzer
  
  private constructor() {}
  
  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer()
    }
    return BundleAnalyzer.instance
  }
  
  // Analyze current bundle size (client-side estimation)
  async analyzeBundleSize(): Promise<Partial<BundleStats>> {
    if (typeof window === 'undefined') {
      return {}
    }
    
    try {
      // Get performance entries for scripts
      const scriptEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('_next/static/chunks/'))
        .map(entry => ({
          name: entry.name.split('/').pop() || 'unknown',
          size: (entry as any).transferSize || 0,
          type: 'js' as const
        }))
      
      // Get CSS entries
      const cssEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.css'))
        .map(entry => ({
          name: entry.name.split('/').pop() || 'unknown',
          size: (entry as any).transferSize || 0,
          type: 'css' as const
        }))
      
      const totalSize = [...scriptEntries, ...cssEntries]
        .reduce((sum, asset) => sum + asset.size, 0)
      
      return {
        totalSize,
        assets: [...scriptEntries, ...cssEntries]
      }
    } catch (error) {
      console.error('Failed to analyze bundle size:', error)
      return {}
    }
  }
  
  // Monitor bundle size changes
  monitorBundleSize(): void {
    if (typeof window === 'undefined') return
    
    const checkBundleSize = async () => {
      const stats = await this.analyzeBundleSize()
      
      if (stats.totalSize && stats.totalSize > 5 * 1024 * 1024) { // 5MB threshold
        console.warn('Bundle size is large:', this.formatBytes(stats.totalSize))
      }
      
      // Log largest assets
      if (stats.assets) {
        const largestAssets = stats.assets
          .sort((a, b) => b.size - a.size)
          .slice(0, 5)
        
        console.log('Largest assets:', largestAssets.map(asset => 
          `${asset.name}: ${this.formatBytes(asset.size)}`
        ))
      }
    }
    
    // Check on page load
    if (document.readyState === 'complete') {
      checkBundleSize()
    } else {
      window.addEventListener('load', checkBundleSize)
    }
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Utility functions for optimized imports
export function createOptimizedImport<T>(
  importFn: () => Promise<T>,
  fallback?: T
): () => Promise<T> {
  let cached: T | null = null
  let loading: Promise<T> | null = null
  
  return async () => {
    if (cached) {
      return cached
    }
    
    if (loading) {
      return loading
    }
    
    loading = importFn().then(result => {
      cached = result
      loading = null
      return result
    }).catch(error => {
      loading = null
      if (fallback) {
        cached = fallback
        return fallback
      }
      throw error
    })
    
    return loading
  }
}

// Preload critical chunks
export async function preloadCriticalChunks(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const criticalChunks = [
    '/_next/static/chunks/pages/_app.js',
    '/_next/static/chunks/main.js',
    '/_next/static/chunks/webpack.js'
  ]
  
  const preloadPromises = criticalChunks.map(chunk => {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = chunk
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Failed to preload ${chunk}`))
      document.head.appendChild(link)
    })
  })
  
  try {
    await Promise.all(preloadPromises)
    console.log('Critical chunks preloaded')
  } catch (error) {
    console.warn('Failed to preload some critical chunks:', error)
  }
}

// Initialize bundle optimization
export function initializeBundleOptimization(): void {
  if (typeof window !== 'undefined') {
    const analyzer = BundleAnalyzer.getInstance()
    analyzer.monitorBundleSize()
    
    // Preload critical chunks
    preloadCriticalChunks()
  }
}