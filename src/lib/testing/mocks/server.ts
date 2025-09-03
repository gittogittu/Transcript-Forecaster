/**
 * Mock Service Worker (MSW) Server for Testing
 * 
 * This sets up API mocking for tests using MSW
 */

import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Define request handlers
const handlers = [
  // Mock Vertex AI API endpoints
  rest.post('https://*/v1/projects/*/locations/*/publishers/google/models/*:predict', (req, res, ctx) => {
    return res(
      ctx.json({
        predictions: [{
          embeddings: {
            values: new Array(768).fill(0.1)
          },
          statistics: {
            token_count: 10
          }
        }]
      })
    )
  }),

  // Mock other API endpoints as needed
  rest.get('/api/embeddings/stats', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          vectorization: {
            totalTranscripts: 100,
            vectorizedTranscripts: 80,
            vectorizationRate: 80,
            modelDistribution: {
              'text-embedding-004': 80
            },
            avgDimensions: 768
          }
        }
      })
    )
  })
]

// Setup server with handlers
export const server = setupServer(...handlers)