import { PredictionCache, getPredictionCache } from '../prediction-cache'

function makeSeries(values: number[]) {
	return values
}

describe('PredictionCache', () => {
	test('exact set/get works with compression', () => {
		const cache = new PredictionCache({ defaultTtlMs: 60_000 })
		const key = { clientId: 'c1', timeHorizon: 'daily' as const, periodsAhead: 14, confidenceLevel: 90 }
		const value = { forecast: [1,2,3] }
		cache.set(key, value, makeSeries([1,2,3,4,5]))
		const got = cache.getExact<typeof value>(key)
		expect(got.hit).toBe(true)
		expect(got.value).toEqual(value)
	})

	test('similarity reuse above threshold returns hit', () => {
		const cache = new PredictionCache({ similarityThreshold: 0.9, defaultTtlMs: 60_000 })
		const key = { clientId: 'c1', timeHorizon: 'daily' as const, periodsAhead: 7, confidenceLevel: 95 }
		const value = { forecast: [10,20,30] }
		cache.set(key, value, makeSeries([1,1,1,1,1,1]))

		// Similar series should have high cosine similarity
		const probe = cache.getSimilar<typeof value>(
			{ ...key, clientId: 'c2' },
			makeSeries([1,1,1,1,1,1])
		)
		expect(probe.hit).toBe(true)
		expect(probe.similarity && probe.similarity).toBeGreaterThanOrEqual(0.9)
		expect(probe.value).toEqual(value)
	})

	test('TTL expiry prevents reuse', () => {
		jest.useFakeTimers()
		const cache = new PredictionCache({ defaultTtlMs: 100 })
		const key = { timeHorizon: 'weekly' as const, periodsAhead: 4, confidenceLevel: 80 }
		cache.set(key, { ok: true }, makeSeries([0,1,0,1]))
		jest.advanceTimersByTime(101)
		const got = cache.getExact(key)
		expect(got.hit).toBe(false)
		jest.useRealTimers()
	})

	test('singleton returns same instance', () => {
		const a = getPredictionCache()
		const b = getPredictionCache()
		expect(a).toBe(b)
	})
})
