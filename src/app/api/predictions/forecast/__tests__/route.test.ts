import { POST } from '../route'

const mockCache = { getSimilar: jest.fn(), set: jest.fn() }
jest.mock('@/lib/cache/prediction-cache', () => ({
	getPredictionCache: () => mockCache,
}))

jest.mock('@/lib/services/forecasting/intelligent-forecasting-engine', () => ({
	intelligentForecastingEngine: {
		generateForecast: jest.fn().mockResolvedValue({
			values: [2,3,4],
			accuracy: { mae: 0.1, rmse: 0.2, mape: 1.2, r2Score: 0.95 },
		}),
	},
}))

jest.mock('@/lib/services/performance-monitoring', () => ({
	createPerformanceMonitor: () => ({
		recordMetrics: jest.fn().mockResolvedValue(undefined),
	}),
}))

describe('Forecast API route - integration skeleton', () => {
	const baseBody = {
		data: {
			timestamps: [new Date().toISOString()],
			values: [1, 1, 1, 1, 1],
		},
		forecastRequest: {
			clientId: 'c1',
			timeHorizon: 'daily',
			periodsAhead: 7,
			confidenceLevel: 95,
		},
	}

	test('returns cache hit response with X-Cache header', async () => {
		const req: any = { json: async () => baseBody }
		mockCache.getSimilar.mockReturnValue({ hit: true, value: { values: [1,2,3] }, similarity: 0.99 })

		const res: any = await POST(req)
		const json = await res.json()
		expect(json.success).toBe(true)
		expect(json.cache.hit).toBe(true)
		expect(res.headers.get('X-Cache')).toBe('HIT')
	})

	test('on cache miss, calls forecasting engine and returns MISS', async () => {
		const req: any = { json: async () => baseBody }
		mockCache.getSimilar.mockReturnValue({ hit: false })

		const res: any = await POST(req)
		const json = await res.json()
		expect(json.success).toBe(true)
		expect(json.cache.hit).toBe(false)
		expect(json.forecast.values).toEqual([2,3,4])
		expect(res.headers.get('X-Cache')).toBe('MISS')
	})
})
