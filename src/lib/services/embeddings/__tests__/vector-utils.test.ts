/**
 * Tests for Vector Database Utils
 * 
 * These tests verify the vector utility functions work correctly
 */

import { VectorDatabaseUtils } from '../../../database/vector-utils'

describe('VectorDatabaseUtils', () => {
  describe('arrayToVector', () => {
    it('should convert array to pgvector format', () => {
      const array = [1.0, 2.5, -0.3, 0.0]
      const result = VectorDatabaseUtils.arrayToVector(array)
      
      expect(result).toBe('[1,2.5,-0.3,0]')
    })

    it('should handle empty array', () => {
      const result = VectorDatabaseUtils.arrayToVector([])
      expect(result).toBe('[]')
    })

    it('should handle single element', () => {
      const result = VectorDatabaseUtils.arrayToVector([42.5])
      expect(result).toBe('[42.5]')
    })
  })

  describe('vectorToArray', () => {
    it('should convert pgvector string to array', () => {
      const vectorString = '[1,2.5,-0.3,0]'
      const result = VectorDatabaseUtils.vectorToArray(vectorString)
      
      expect(result).toEqual([1, 2.5, -0.3, 0])
    })

    it('should handle empty vector', () => {
      const result = VectorDatabaseUtils.vectorToArray('[]')
      expect(result).toEqual([])
    })

    it('should handle whitespace', () => {
      const vectorString = '[ 1 , 2.5 , -0.3 , 0 ]'
      const result = VectorDatabaseUtils.vectorToArray(vectorString)
      
      expect(result).toEqual([1, 2.5, -0.3, 0])
    })
  })

  describe('normalizeVector', () => {
    it('should normalize vector to unit length', () => {
      const vector = [3, 4, 0] // magnitude = 5
      const result = VectorDatabaseUtils.normalizeVector(vector)
      
      expect(result).toEqual([0.6, 0.8, 0])
      
      // Check magnitude is 1
      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0))
      expect(magnitude).toBeCloseTo(1.0, 10)
    })

    it('should handle zero vector', () => {
      const vector = [0, 0, 0]
      const result = VectorDatabaseUtils.normalizeVector(vector)
      
      expect(result).toEqual([0, 0, 0])
    })

    it('should handle single element vector', () => {
      const vector = [5]
      const result = VectorDatabaseUtils.normalizeVector(vector)
      
      expect(result).toEqual([1])
    })

    it('should handle negative values', () => {
      const vector = [-3, -4, 0]
      const result = VectorDatabaseUtils.normalizeVector(vector)
      
      expect(result).toEqual([-0.6, -0.8, 0])
    })
  })

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0]
      const b = [0, 1, 0]
      
      const similarity = VectorDatabaseUtils.cosineSimilarity(a, b)
      expect(similarity).toBe(0) // Orthogonal vectors
    })

    it('should return 1 for identical vectors', () => {
      const a = [1, 2, 3]
      const b = [1, 2, 3]
      
      const similarity = VectorDatabaseUtils.cosineSimilarity(a, b)
      expect(similarity).toBeCloseTo(1.0, 10)
    })

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0]
      const b = [-1, 0, 0]
      
      const similarity = VectorDatabaseUtils.cosineSimilarity(a, b)
      expect(similarity).toBeCloseTo(-1.0, 10)
    })

    it('should handle zero vectors', () => {
      const a = [0, 0, 0]
      const b = [1, 2, 3]
      
      const similarity = VectorDatabaseUtils.cosineSimilarity(a, b)
      expect(similarity).toBe(0)
    })

    it('should throw error for different length vectors', () => {
      const a = [1, 2]
      const b = [1, 2, 3]
      
      expect(() => VectorDatabaseUtils.cosineSimilarity(a, b))
        .toThrow('Vectors must have the same length')
    })

    it('should calculate similarity for normalized vectors', () => {
      const a = [3, 4, 0] // magnitude = 5
      const b = [0, 3, 4] // magnitude = 5
      
      const similarity = VectorDatabaseUtils.cosineSimilarity(a, b)
      
      // Dot product = 0*3 + 4*3 + 0*4 = 12
      // Similarity = 12 / (5 * 5) = 0.48
      expect(similarity).toBeCloseTo(0.48, 10)
    })
  })

  describe('round trip conversion', () => {
    it('should maintain precision through array->vector->array conversion', () => {
      const original = [1.123456789, -2.987654321, 0.0, 42.5]
      
      const vectorString = VectorDatabaseUtils.arrayToVector(original)
      const converted = VectorDatabaseUtils.vectorToArray(vectorString)
      
      expect(converted).toEqual(original)
    })

    it('should handle large arrays', () => {
      const original = new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1))
      
      const vectorString = VectorDatabaseUtils.arrayToVector(original)
      const converted = VectorDatabaseUtils.vectorToArray(vectorString)
      
      expect(converted).toHaveLength(768)
      expect(converted[0]).toBeCloseTo(original[0], 10)
      expect(converted[767]).toBeCloseTo(original[767], 10)
    })
  })

  describe('edge cases', () => {
    it('should handle very small numbers', () => {
      const vector = [1e-10, 2e-10, 3e-10]
      const normalized = VectorDatabaseUtils.normalizeVector(vector)
      
      const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
      expect(magnitude).toBeCloseTo(1.0, 5)
    })

    it('should handle very large numbers', () => {
      const vector = [1e10, 2e10, 3e10]
      const normalized = VectorDatabaseUtils.normalizeVector(vector)
      
      const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
      expect(magnitude).toBeCloseTo(1.0, 5)
    })

    it('should handle NaN values gracefully', () => {
      const vector = [1, NaN, 3]
      
      expect(() => VectorDatabaseUtils.normalizeVector(vector))
        .not.toThrow()
      
      const result = VectorDatabaseUtils.normalizeVector(vector)
      expect(result.some(isNaN)).toBe(true)
    })
  })
})