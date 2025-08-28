import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ESLint configuration for build
  eslint: {
    // Only run ESLint on specific directories during build
    dirs: ['src/app', 'src/components', 'src/lib'],
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even if there are type errors
    ignoreBuildErrors: true,
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'lucide-react'
      // 'recharts' - temporarily disabled due to SSR issues
    ],
  },

  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle client-side fallbacks for various Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
    }

    // Exclude client-only libraries from server bundle
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'framer-motion': 'framer-motion',
        'recharts': 'recharts'
      })
    }

    // Add global polyfills for client-side libraries
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'global.self': 'self',
        })
      )
    }
    // Simplified optimization to avoid SSR issues
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    }

    // Bundle analyzer in development
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      
      if (process.env.ANALYZE === 'true') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-analyzer-report.html',
          })
        )
      }
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
    }

    return config
  },

  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },

  // PWA configuration
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js',
      },
      {
        source: '/manifest.json',
        destination: '/manifest.json',
      }
    ]
  }
}

export default nextConfig
