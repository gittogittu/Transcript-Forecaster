import { QueryClient } from '@tanstack/react-query'
import { InvalidationStrategies, RealtimeUpdateStrategies, BackgroundSyncStrategies } from '../invalidation-strategies'
import { queryKeys } from '../query-client'

describe('InvalidationStrategies', () => {
  let queryClient: QueryClient
  let invalidationStrategies: InvalidationStrategies

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    invalidationStrategies = new InvalidationStrategies(queryClient)

    // Mock console.warn to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('transcript invalidation', () => {
    it('should invalidate transcript lists and analytics on create', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.transcript.onCreate()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.lists() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.summary() })
    })

    it('should invalidate specific transcript and related data on update', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
      const transcriptId = 'test-id'

      invalidationStrategies.transcript.onUpdate(transcriptId)

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.detail(transcriptId) })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.lists() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })
    })

    it('should remove specific transcript and invalidate lists on delete', () => {
      const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries')
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
      const transcriptId = 'test-id'

      invalidationStrategies.transcript.onDelete(transcriptId)

      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.detail(transcriptId) })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.lists() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })
    })

    it('should invalidate all transcript and analytics data on bulk operation', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.transcript.onBulkOperation()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.all })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })
    })
  })

  describe('analytics invalidation', () => {
    it('should invalidate predictions and summary on prediction generation', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.analytics.onPredictionGenerated()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.predictions() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.summary() })
    })

    it('should invalidate trends and summary on trend update', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.analytics.onTrendUpdate()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.trends() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.summary() })
    })

    it('should invalidate all analytics on data source change', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.analytics.onDataSourceChange()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })
    })
  })

  describe('monitoring invalidation', () => {
    it('should invalidate metrics and health on metric recorded', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.monitoring.onMetricRecorded()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.monitoring.metrics() })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.monitoring.health() })
    })

    it('should invalidate health on health change', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.monitoring.onHealthChange()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.monitoring.health() })
    })

    it('should invalidate all monitoring on alert configured', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.monitoring.onAlertConfigured()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.monitoring.all })
    })
  })

  describe('user invalidation', () => {
    it('should invalidate user profile on profile update', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.user.onProfileUpdate()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users.profile() })
    })

    it('should invalidate all queries on role change', () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      invalidationStrategies.user.onRoleChange()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users.all })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith() // Called without parameters for all queries
    })
  })

  describe('global invalidation', () => {
    it('should clear all data on logout', () => {
      const clearSpy = jest.spyOn(queryClient, 'clear')

      invalidationStrategies.global.onLogout()

      expect(clearSpy).toHaveBeenCalled()
    })

    it('should refetch active queries on reconnect', () => {
      const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries')

      invalidationStrategies.global.onReconnect()

      expect(refetchQueriesSpy).toHaveBeenCalledWith({ type: 'active' })
    })

    it('should refetch stale queries on visibility change', () => {
      const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries')

      invalidationStrategies.global.onVisibilityChange()

      expect(refetchQueriesSpy).toHaveBeenCalledWith({ stale: true })
    })

    it('should clear all data on emergency clear', () => {
      const clearSpy = jest.spyOn(queryClient, 'clear')

      invalidationStrategies.global.clearAll()

      expect(clearSpy).toHaveBeenCalled()
    })
  })
})

describe('RealtimeUpdateStrategies', () => {
  let queryClient: QueryClient
  let realtimeStrategies: RealtimeUpdateStrategies

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    realtimeStrategies = new RealtimeUpdateStrategies(queryClient)

    // Mock setInterval
    jest.useFakeTimers()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('should set up real-time listeners with intervals', () => {
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    realtimeStrategies.setupRealtimeListeners()

    // Fast-forward 30 seconds for transcript updates
    jest.advanceTimersByTime(30000)
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.transcripts.lists(),
      refetchType: 'active'
    })

    // Fast-forward 60 seconds for analytics updates
    jest.advanceTimersByTime(30000) // Total 60 seconds
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.analytics.trends(),
      refetchType: 'active'
    })

    // Fast-forward 15 seconds for monitoring updates (should have triggered multiple times)
    jest.advanceTimersByTime(15000) // Total 75 seconds
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.monitoring.metrics(),
      refetchType: 'active'
    })
  })

  it('should handle WebSocket messages correctly', () => {
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries')

    // Test transcript created message
    realtimeStrategies.handleWebSocketMessage({
      type: 'transcript_created',
      data: { id: 'new-id' }
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.lists() })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.all })

    // Test transcript updated message
    realtimeStrategies.handleWebSocketMessage({
      type: 'transcript_updated',
      data: { id: 'updated-id' }
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.detail('updated-id') })

    // Test transcript deleted message
    realtimeStrategies.handleWebSocketMessage({
      type: 'transcript_deleted',
      data: { id: 'deleted-id' }
    })

    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transcripts.detail('deleted-id') })

    // Test prediction generated message
    realtimeStrategies.handleWebSocketMessage({
      type: 'prediction_generated',
      data: {}
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.analytics.predictions() })

    // Test metric recorded message
    realtimeStrategies.handleWebSocketMessage({
      type: 'metric_recorded',
      data: {}
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.monitoring.metrics() })

    // Test unknown message type
    realtimeStrategies.handleWebSocketMessage({
      type: 'unknown_type',
      data: {}
    })

    expect(console.warn).toHaveBeenCalledWith('Unknown WebSocket message type:', 'unknown_type')
  })
})

describe('BackgroundSyncStrategies', () => {
  let queryClient: QueryClient
  let backgroundStrategies: BackgroundSyncStrategies

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    backgroundStrategies = new BackgroundSyncStrategies(queryClient)

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should prefetch related data on transcript view', () => {
    const prefetchQuerySpy = jest.spyOn(queryClient, 'prefetchQuery')

    backgroundStrategies.prefetchRelatedData.onTranscriptView('test-id')

    expect(prefetchQuerySpy).toHaveBeenCalledWith({
      queryKey: queryKeys.analytics.trends(),
      queryFn: expect.any(Function),
      staleTime: 5 * 60 * 1000,
    })
  })

  it('should prefetch monitoring data on analytics view', () => {
    const prefetchQuerySpy = jest.spyOn(queryClient, 'prefetchQuery')

    backgroundStrategies.prefetchRelatedData.onAnalyticsView()

    expect(prefetchQuerySpy).toHaveBeenCalledWith({
      queryKey: queryKeys.monitoring.health(),
      queryFn: expect.any(Function),
      staleTime: 30 * 1000,
    })
  })

  it('should refresh critical data in background', () => {
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    backgroundStrategies.backgroundRefresh.refreshCriticalData()

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.monitoring.health(),
      refetchType: 'none'
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.transcripts.lists(),
      refetchType: 'none'
    })
  })

  it('should refresh analytics data in background', () => {
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    backgroundStrategies.backgroundRefresh.refreshAnalytics()

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.analytics.all,
      refetchType: 'none'
    })
  })
})