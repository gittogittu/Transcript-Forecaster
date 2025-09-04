import { RealTimeDataUpdate } from '@/components/analytics/dashboard/types'

export interface RealTimeServiceConfig {
  endpoint?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface DataSubscription {
  widgetId: string
  dataSource: string
  filters?: Record<string, any>
  callback: (update: RealTimeDataUpdate) => void
}

export class RealTimeService {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, DataSubscription>()
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  
  private config: Required<RealTimeServiceConfig>
  
  constructor(config: RealTimeServiceConfig = {}) {
    this.config = {
      endpoint: config.endpoint || 'ws://localhost:3000/api/ws/dashboard',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      // For demo purposes, we'll simulate WebSocket connection
      // In production, this would connect to a real WebSocket endpoint
      await this.simulateConnection()
    } catch (error) {
      console.error('Failed to connect to real-time service:', error)
      this.scheduleReconnect()
    } finally {
      this.isConnecting = false
    }
  }

  private async simulateConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Simulate WebSocket connection
        this.ws = {
          readyState: WebSocket.OPEN,
          send: (data: string) => {
            console.log('Sending data:', data)
          },
          close: () => {
            this.handleDisconnect()
          },
          addEventListener: (event: string, handler: any) => {
            // Simulate event listeners
          },
          removeEventListener: (event: string, handler: any) => {
            // Simulate event listener removal
          }
        } as any

        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.startDataGeneration()
        
        console.log('Connected to real-time service (simulated)')
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private startDataGeneration(): void {
    // Simulate real-time data updates
    const generateData = () => {
      this.subscriptions.forEach((subscription) => {
        const update: RealTimeDataUpdate = {
          widgetId: subscription.widgetId,
          data: this.generateMockData(subscription.dataSource),
          timestamp: new Date(),
          type: 'append'
        }
        
        subscription.callback(update)
      })
    }

    // Generate data every 5 seconds
    setInterval(generateData, 5000)
  }

  private generateMockData(dataSource: string): any {
    const now = new Date()
    
    switch (dataSource) {
      case 'real-time':
        return {
          timestamp: now.toISOString(),
          value: 100 + Math.sin(now.getTime() / 10000) * 20 + (Math.random() - 0.5) * 10,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
        }
      
      case 'anomalies':
        // Occasionally generate anomaly data
        if (Math.random() < 0.1) {
          return {
            id: `anomaly-${Date.now()}`,
            timestamp: now.toISOString(),
            severity: Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low',
            description: 'Unusual pattern detected in real-time data stream',
            value: Math.random() * 200 + 50
          }
        }
        return null
      
      case 'metrics':
        return {
          timestamp: now.toISOString(),
          mae: 2.5 + Math.random() * 2,
          rmse: 3.2 + Math.random() * 2,
          mape: 2.8 + Math.random() * 2,
          r2Score: 0.85 + Math.random() * 0.1
        }
      
      default:
        return {
          timestamp: now.toISOString(),
          value: Math.random() * 100
        }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscriptions.clear()
    console.log('Disconnected from real-time service')
  }

  subscribe(subscription: DataSubscription): () => void {
    const subscriptionId = `${subscription.widgetId}-${subscription.dataSource}`
    this.subscriptions.set(subscriptionId, subscription)

    // Send subscription message to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        widgetId: subscription.widgetId,
        dataSource: subscription.dataSource,
        filters: subscription.filters
      }))
    }

    console.log(`Subscribed to ${subscription.dataSource} for widget ${subscription.widgetId}`)

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId)
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'unsubscribe',
          widgetId: subscription.widgetId,
          dataSource: subscription.dataSource
        }))
      }
      
      console.log(`Unsubscribed from ${subscription.dataSource} for widget ${subscription.widgetId}`)
    }
  }

  private handleDisconnect(): void {
    this.ws = null
    console.log('Real-time service disconnected')
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.config.heartbeatInterval)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnecting) return 'connecting'
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected'
    return 'disconnected'
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size
  }

  // Manual data refresh for specific widget
  async refreshWidget(widgetId: string, dataSource: string): Promise<any> {
    try {
      const response = await fetch('/api/analytics/dashboard/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widgetId,
          dataSource,
          timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to refresh widget data:', error)
      throw error
    }
  }
}

// Singleton instance
let realTimeService: RealTimeService | null = null

export function getRealTimeService(config?: RealTimeServiceConfig): RealTimeService {
  if (!realTimeService) {
    realTimeService = new RealTimeService(config)
  }
  return realTimeService
}

// React hook for using the real-time service
export function useRealTimeService() {
  const service = getRealTimeService()
  
  return {
    service,
    connect: () => service.connect(),
    disconnect: () => service.disconnect(),
    subscribe: (subscription: DataSubscription) => service.subscribe(subscription),
    isConnected: () => service.isConnected(),
    getConnectionStatus: () => service.getConnectionStatus(),
    refreshWidget: (widgetId: string, dataSource: string) => service.refreshWidget(widgetId, dataSource)
  }
}