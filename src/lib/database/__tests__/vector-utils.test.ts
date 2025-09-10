import { VectorDatabaseUtils } from '../vector-utils'

describe('VectorDatabaseUtils', () => {
	test('cosineSimilarity is 1 for identical vectors', () => {
		const a = [1, 2, 3]
		const b = [1, 2, 3]
		expect(VectorDatabaseUtils.cosineSimilarity(a, b)).toBeCloseTo(1, 5)
	})

	test('cosineSimilarity is ~0 for orthogonal vectors', () => {
		const a = [1, 0, 0]
		const b = [0, 1, 0]
		expect(Math.abs(VectorDatabaseUtils.cosineSimilarity(a, b))).toBeLessThan(1e-6)
	})

	test('arrayToVector formats correctly', () => {
		const vec = VectorDatabaseUtils.arrayToVector([0.1, 0.2])
		expect(vec).toBe('[0.1,0.2]')
	})
})
