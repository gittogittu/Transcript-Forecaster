'use client'

import React from 'react'
import {
  useTranscripts,
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
} from '../use-transcripts'
import { useRealtimeAnalytics } from '../use-analytics'
import { useRealtimeMonitoring } from '../use-monitoring'
import {
  useEnhancedQuery,
  useEnhancedMutation,
  QueryStateWrapper,
} from '../use-query-states'
import {
  TranscriptErrorBoundary,
  AnalyticsErrorBoundary,
  MonitoringErrorBoundary,
} from '@/components/error-boundaries/query-error-boundary'

// Example component showing how to use TanStack Query hooks
export function TranscriptDashboardExample() {
  // Fetch transcripts with enhanced query state
  const transcriptsQuery = useTranscripts({ limit: 10 })
  const enhancedTranscripts = useEnhancedQuery(transcriptsQuery)

  // Real-time analytics data
  const analytics = useRealtimeAnalytics()

  // Performance monitoring
  const monitoring = useRealtimeMonitoring()

  // Mutations with enhanced state
  const createMutation = useCreateTranscript()
  const updateMutation = useUpdateTranscript()
  const deleteMutation = useDeleteTranscript()

  const enhancedCreate = useEnhancedMutation(createMutation)
  const enhancedUpdate = useEnhancedMutation(updateMutation)
  const enhancedDelete = useEnhancedMutation(deleteMutation)

  // Handle create transcript
  const handleCreateTranscript = () => {
    createMutation.mutate({
      clientName: 'New Client',
      date: new Date(),
      transcriptCount: 10,
      createdBy: 'current-user-id',
    })
  }

  // Handle update transcript
  const handleUpdateTranscript = (id: string) => {
    updateMutation.mutate({
      id,
      data: { transcriptCount: 15 },
    })
  }

  // Handle delete transcript
  const handleDeleteTranscript = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Transcript Analytics Dashboard</h1>

      {/* Performance Monitoring Section */}
      <MonitoringErrorBoundary>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">System Health</h2>
          {monitoring.isLoading && (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          )}
          {monitoring.health.data && (
            <div className="space-y-2">
              <div className={`inline-block px-2 py-1 rounded text-sm ${
                monitoring.health.data.status === 'healthy' 
                  ? 'bg-green-100 text-green-800'
                  : monitoring.health.data.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                Status: {monitoring.health.data.status}
              </div>
              <p className="text-sm text-gray-600">
                Uptime: {Math.floor(monitoring.health.data.uptime / 3600)}h
              </p>
            </div>
          )}
        </div>
      </MonitoringErrorBoundary>

      {/* Analytics Section */}
      <AnalyticsErrorBoundary>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Analytics Overview</h2>
          {analytics.isLoading && (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          )}
          {analytics.summary.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.summary.data.totalTranscripts}
                </div>
                <div className="text-sm text-gray-600">Total Transcripts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.summary.data.averagePerDay.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg per Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.summary.data.peakCount}
                </div>
                <div className="text-sm text-gray-600">Peak Count</div>
              </div>
              <div className="text-center">
                <button
                  onClick={analytics.refetchAll}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  disabled={analytics.isLoading}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </AnalyticsErrorBoundary>

      {/* Transcripts Section */}
      <TranscriptErrorBoundary>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Transcripts</h2>
            <div className="space-x-2">
              <button
                onClick={handleCreateTranscript}
                disabled={enhancedCreate.isPending}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {enhancedCreate.isPending ? 'Creating...' : 'Add Transcript'}
              </button>
              <button
                onClick={enhancedTranscripts.refetch}
                disabled={enhancedTranscripts.isFetching}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {enhancedTranscripts.isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <QueryStateWrapper
            queryState={enhancedTranscripts}
            loadingSkeleton={
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            }
          >
            {(transcripts) => (
              <div className="space-y-2">
                {transcripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{transcript.clientName}</div>
                      <div className="text-sm text-gray-600">
                        {transcript.date.toLocaleDateString()} • {transcript.transcriptCount} transcripts
                      </div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleUpdateTranscript(transcript.id)}
                        disabled={enhancedUpdate.isPending}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDeleteTranscript(transcript.id)}
                        disabled={enhancedDelete.isPending}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryStateWrapper>

          {/* Mutation Status */}
          {(enhancedCreate.isError || enhancedUpdate.isError || enhancedDelete.isError) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <div className="text-red-800 font-medium">Operation Failed</div>
              <div className="text-red-600 text-sm">
                {enhancedCreate.errorMessage || enhancedUpdate.errorMessage || enhancedDelete.errorMessage}
              </div>
              <div className="mt-2 space-x-2">
                {enhancedCreate.canRetry && (
                  <button
                    onClick={enhancedCreate.retry}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry Create
                  </button>
                )}
                {enhancedUpdate.canRetry && (
                  <button
                    onClick={enhancedUpdate.retry}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry Update
                  </button>
                )}
                {enhancedDelete.canRetry && (
                  <button
                    onClick={enhancedDelete.retry}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {(enhancedCreate.isSuccess || enhancedUpdate.isSuccess || enhancedDelete.isSuccess) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-green-800 font-medium">Operation Successful</div>
              <div className="text-green-600 text-sm">
                {enhancedCreate.isSuccess && 'Transcript created successfully'}
                {enhancedUpdate.isSuccess && 'Transcript updated successfully'}
                {enhancedDelete.isSuccess && 'Transcript deleted successfully'}
              </div>
            </div>
          )}
        </div>
      </TranscriptErrorBoundary>
    </div>
  )
}