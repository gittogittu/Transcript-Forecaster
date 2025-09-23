'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedDashboard } from '@/components/analytics/EnhancedDashboard'
import { EnhancedPredictionChart } from '@/components/analytics/EnhancedPredictionChart'
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Users, 
  Activity,
  Zap,
  Target,
  Clock
} from 'lucide-react'

export default function EnhancedDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Enhanced Analytics Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Real-time insights and AI-powered predictions for your transcript analytics platform
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-500">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
            <Badge variant="outline">
              <Brain className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="flex items-center space-x-3 p-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Real-time Monitoring</p>
                <p className="text-xs text-blue-600">Live system health & metrics</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex items-center space-x-3 p-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">AI Predictions</p>
                <p className="text-xs text-green-600">ML-powered forecasting</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="flex items-center space-x-3 p-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Trend Analysis</p>
                <p className="text-xs text-purple-600">Pattern recognition</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="flex items-center space-x-3 p-4">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Auto-refresh</p>
                <p className="text-xs text-orange-600">Real-time updates</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>System Overview</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>ML Predictions</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Advanced Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <EnhancedDashboard />
        </TabsContent>

        {/* ML Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Prediction Chart */}
            <div className="lg:col-span-3">
              <EnhancedPredictionChart 
                clientId="enhanced-dashboard" 
                autoRefresh={true}
                showControls={true}
              />
            </div>
          </div>

          {/* Multiple Client Predictions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Client A Forecast</span>
                </CardTitle>
                <CardDescription>
                  High-volume enterprise client predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPredictionChart 
                  clientId="client-a" 
                  autoRefresh={false}
                  showControls={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Client B Forecast</span>
                </CardTitle>
                <CardDescription>
                  Medium-volume client with seasonal patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPredictionChart 
                  clientId="client-b" 
                  autoRefresh={false}
                  showControls={false}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
                <CardDescription>
                  Real-time system performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* API Response Times */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">API Response Time</span>
                    <span className="text-sm text-green-600">85ms avg</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>

                {/* ML Model Accuracy */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">ML Model Accuracy</span>
                    <span className="text-sm text-blue-600">94.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '94%'}}></div>
                  </div>
                </div>

                {/* Database Performance */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Database Performance</span>
                    <span className="text-sm text-purple-600">92.7%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: '93%'}}></div>
                  </div>
                </div>

                {/* Vector Search Speed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Vector Search Speed</span>
                    <span className="text-sm text-orange-600">156ms avg</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: '78%'}}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Health Summary</span>
                </CardTitle>
                <CardDescription>
                  Overall platform health status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-green-700">System Uptime</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">10/10</div>
                    <div className="text-sm text-blue-700">Features Online</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-sm text-purple-700">Critical Alerts</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">1.2k</div>
                    <div className="text-sm text-orange-700">Daily Predictions</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Recent Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Last prediction generated</span>
                      <span className="text-green-600">2 minutes ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Model retrained</span>
                      <span className="text-blue-600">1 hour ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Health check passed</span>
                      <span className="text-green-600">Just now</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Client data imported</span>
                      <span className="text-purple-600">3 hours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Predictions Today</p>
                    <p className="text-3xl font-bold text-blue-900">1,247</p>
                    <p className="text-sm text-blue-600">+12% from yesterday</p>
                  </div>
                  <Brain className="h-12 w-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Average Accuracy</p>
                    <p className="text-3xl font-bold text-green-900">94.2%</p>
                    <p className="text-sm text-green-600">+0.3% this week</p>
                  </div>
                  <Target className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Active Clients</p>
                    <p className="text-3xl font-bold text-purple-900">87</p>
                    <p className="text-sm text-purple-600">+5 new this month</p>
                  </div>
                  <Users className="h-12 w-12 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-6">
        <p>
          Enhanced Analytics Dashboard • Real-time data updates every 30 seconds • 
          Powered by ML prediction engine v1.0.0
        </p>
      </div>
    </div>
  )
}