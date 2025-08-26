'use client'

// Service Worker registration and management utilities
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private isOnline = true

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.setupOnlineOfflineListeners()
    }
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  // Register service worker
  async register(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered successfully')

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUpdate()
            }
          })
        }
      })

      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      console.log('Service Worker unregistered')
      return result
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
      return false
    }
  }

  // Update service worker
  async update(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      await this.registration.update()
      console.log('Service Worker updated')
    } catch (error) {
      console.error('Service Worker update failed:', error)
    }
  }

  // Skip waiting and activate new service worker
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }

  // Check if app is running offline
  isOffline(): boolean {
    return !this.isOnline
  }

  // Get cache status
  async getCacheStatus(): Promise<{
    staticCacheSize: number
    dynamicCacheSize: number
    totalSize: number
  }> {
    if (!('caches' in window)) {
      return { staticCacheSize: 0, dynamicCacheSize: 0, totalSize: 0 }
    }

    try {
      const cacheNames = await caches.keys()
      let staticCacheSize = 0
      let dynamicCacheSize = 0

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
        
        if (cacheName.includes('static')) {
          staticCacheSize += keys.length
        } else {
          dynamicCacheSize += keys.length
        }
      }

      return {
        staticCacheSize,
        dynamicCacheSize,
        totalSize: staticCacheSize + dynamicCacheSize
      }
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return { staticCacheSize: 0, dynamicCacheSize: 0, totalSize: 0 }
    }
  }

  // Clear all caches
  async clearCaches(): Promise<boolean> {
    if (!('caches' in window)) {
      return false
    }

    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('All caches cleared')
      return true
    } catch (error) {
      console.error('Failed to clear caches:', error)
      return false
    }
  }

  // Background sync for offline data
  async scheduleBackgroundSync(tag: string, data?: any): Promise<void> {
    if (!this.registration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported')
      return
    }

    try {
      // Store data for sync if provided
      if (data) {
        await this.storePendingData(tag, data)
      }

      await (this.registration as any).sync?.register(tag)
      console.log('Background sync scheduled:', tag)
    } catch (error) {
      console.error('Failed to schedule background sync:', error)
    }
  }

  // Store data for offline sync
  private async storePendingData(tag: string, data: any): Promise<void> {
    if (!('indexedDB' in window)) {
      // Fallback to localStorage
      const existing = localStorage.getItem(`pending-${tag}`) || '[]'
      const pendingData = JSON.parse(existing)
      pendingData.push({ ...data, timestamp: Date.now() })
      localStorage.setItem(`pending-${tag}`, JSON.stringify(pendingData))
      return
    }

    // Use IndexedDB for better storage
    // Implementation would use IndexedDB API
    console.log('Storing pending data:', tag, data)
  }

  // Setup online/offline event listeners
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('App is online')
      this.handleOnline()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('App is offline')
      this.handleOffline()
    })
  }

  // Handle online event
  private handleOnline(): void {
    // Trigger background sync for pending data
    this.scheduleBackgroundSync('background-sync-transcripts')
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('app-online'))
  }

  // Handle offline event
  private handleOffline(): void {
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('app-offline'))
  }

  // Notify about service worker update
  private notifyUpdate(): void {
    // Dispatch custom event for update notification
    window.dispatchEvent(new CustomEvent('sw-update-available'))
  }
}

// Hook for using service worker in React components
export function useServiceWorker() {
  const sw = ServiceWorkerManager.getInstance()

  return {
    register: () => sw.register(),
    unregister: () => sw.unregister(),
    update: () => sw.update(),
    skipWaiting: () => sw.skipWaiting(),
    isOffline: () => sw.isOffline(),
    getCacheStatus: () => sw.getCacheStatus(),
    clearCaches: () => sw.clearCaches(),
    scheduleBackgroundSync: (tag: string, data?: any) => sw.scheduleBackgroundSync(tag, data)
  }
}

// Initialize service worker
export async function initializeServiceWorker(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const sw = ServiceWorkerManager.getInstance()
    await sw.register()
  }
}