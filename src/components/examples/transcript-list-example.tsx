'use client'

import { useTranscripts, useCreateTranscript } from '@/lib/hooks/use-transcripts'
import { useAutomaticCacheManagement } from '@/lib/hooks/use-cache-management'
import { useQueryState } from '@/lib/hooks/use-query-states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Example component demonstrating TanStack Query usage with transcript data
 * This shows how to use the custom hooks for data fetching and mutations
 */
export function TranscriptListExample() {
  // Set up automatic cache management
  useAutomaticCacheManagement()

  // Fetch transcripts with filtering
  const transcriptsQuery = useTranscripts({ 
    clientName: '', // No filter
    minCount: 0 
  })

  // Get enhanced query state
  const queryState = useQueryState(transcriptsQuery)

  // Create mutation for adding new transcripts
  const createMutation = useCreateTranscript()

  const handleAddSample = () => {
    createMutation.mutate({
      clientName: 'Sample Client',
      month: '2024-02',
      transcriptCount: 25,
      notes: 'Sample transcript data'
    })
  }

  if (queryState.isInitialLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (queryState.isError) {
    return (
      <Card className="p-6 border-red-200">
        <div className="text-red-600">
          <h3 className="font-semibold mb-2">Error Loading Transcripts</h3>
          <p className="text-sm">{queryState.errorMessage}</p>
          {queryState.canRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => transcriptsQuery.refetch()}
            >
              Retry
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transcript Data</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleAddSample}
              disabled={createMutation.isPending}
              size="sm"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Sample'}
            </Button>
            <Button
              variant="outline"
              onClick={() => transcriptsQuery.refetch()}
              disabled={queryState.isFetching}
              size="sm"
            >
              {queryState.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-2 mb-4 text-sm">
          {queryState.isStale && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
              Data is stale
            </span>
          )}
          {queryState.isFetching && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Fetching...
            </span>
          )}
          {createMutation.isSuccess && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
              Added successfully
            </span>
          )}
          {createMutation.isError && (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
              Failed to add
            </span>
          )}
        </div>

        {/* Data display */}
        {queryState.data && queryState.data.length > 0 ? (
          <div className="space-y-2">
            {queryState.data.map((transcript) => (
              <div
                key={transcript.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{transcript.clientName}</div>
                  <div className="text-sm text-gray-600">
                    {transcript.month} • {transcript.transcriptCount} transcripts
                  </div>
                  {transcript.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      {transcript.notes}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Updated: {transcript.updatedAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No transcript data available</p>
            <p className="text-sm mt-1">Try adding some sample data</p>
          </div>
        )}

        {/* Cache info */}
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Last updated: {new Date(queryState.dataUpdatedAt).toLocaleTimeString()}</span>
            <span>Retry count: {queryState.retryCount}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}