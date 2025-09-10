import { VertexAIConfigManager } from '../config'
import { getVertexAIClient, resetVertexAIClient } from '../client'

jest.mock('@google-cloud/aiplatform', () => ({
	v1: {
		ModelServiceClient: jest.fn().mockImplementation(() => ({})),
		EndpointServiceClient: jest.fn().mockImplementation(() => ({})),
		PipelineServiceClient: jest.fn().mockImplementation(() => ({})),
		PredictionServiceClient: jest.fn().mockImplementation(() => ({})),
		JobServiceClient: jest.fn().mockImplementation(() => ({})),
	},
}))

describe('VertexAI Config and Client', () => {
	beforeEach(() => {
		resetVertexAIClient()
	})

	test('VertexAIConfigManager singleton returns configured options', () => {
		const manager = VertexAIConfigManager.getInstance()
		manager.updateConfig({ projectId: 'test-project', location: 'us-central1' })
		const clientOptions = manager.getClientOptions()
		expect(clientOptions.projectId).toBe('test-project')
		expect(clientOptions.location).toBe('us-central1')
		expect(clientOptions.timeout).toBeGreaterThan(0)
	})

	test('getVertexAIClient returns singleton instance', () => {
		const c1 = getVertexAIClient({ projectId: 'p1' })
		const c2 = getVertexAIClient({ projectId: 'p2' })
		expect(c1).toBe(c2)
	})
})
