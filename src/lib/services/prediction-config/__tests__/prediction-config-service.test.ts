/**
 * Tests for Prediction Configuration Service
 */

import { Pool } from 'pg'
import { PredictionConfigurationService } from '../prediction-config-service'
import { 
  PredictionConfiguration, 
  PredictionConfigurationRequest,
  ConfigurationSearchFilters 
} from '@/types/prediction-config'

// Mock database
const mockDb = {
  connect: jest.fn(),
  query: jest.fn()
} as unknown as Pool

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
}

describe('PredictionConfigurationService', () => {
  let service: PredictionConfigurationService
  const userId = 'test-user-123'

  beforeEach(() => {
    service = new PredictionConfigurationService(mockDb)
    jest.clearAllMocks()
    
    // Setup default mock behavior
    ;(mockDb.connect as jest.Mock).mockResolvedValue(mockClient)
  })

  describe('createConfiguration', () => {
    it('should create a valid prediction configuration', async () => {
      const request: PredictionConfigurationRequest = {
        config: {
          name: 'Test Configuration',
          description: 'A test configuration',
          filters: {
            clientIds: ['client-1', 'client-2'],
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31')
            }
          },
          parameters: {
            confidenceLevel: 0.95,
            forecastHorizon: 30,
            modelAlgorithm: 'automl'
          }
        }
      }

      const mockResult = {
        rows: [{
          id: 'config-123',
          created_at: new Date(),
          updated_at: new Date()
        }]
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockResult) // INSERT
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.createConfiguration(request, userId)

      expect(result.validation.isValid).toBe(true)
      expect(result.config.id).toBe('config-123')
      expect(result.config.name).toBe('Test Configuration')
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should reject configuration with invalid confidence level', async () => {
      const request: PredictionConfigurationRequest = {
        config: {
          name: 'Invalid Configuration',
          filters: {},
          parameters: {
            confidenceLevel: 1.5, // Invalid - too high
            forecastHorizon: 30
          }
        }
      }

      const result = await service.createConfiguration(request, userId)

      expect(result.validation.isValid).toBe(false)
      expect(result.validation.errors).toHaveLength(1)
      expect(result.validation.errors[0].field).toBe('parameters.confidenceLevel')
      expect(mockClient.query).not.toHaveBeenCalled()
    })

    it('should reject configuration with invalid forecast horizon', async () => {
      const request: PredictionConfigurationRequest = {
        config: {
          name: 'Invalid Configuration',
          filters: {},
          parameters: {
            confidenceLevel: 0.95,
            forecastHorizon: 500 // Invalid - too high
          }
        }
      }

      const result = await service.createConfiguration(request, userId)

      expect(result.validation.isValid).toBe(false)
      expect(result.validation.errors).toHaveLength(1)
      expect(result.validation.errors[0].field).toBe('parameters.forecastHorizon')
    })

    it('should warn about short date ranges', async () => {
      const request: PredictionConfigurationRequest = {
        config: {
          name: 'Short Range Configuration',
          filters: {
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-01-15') // Only 14 days
            }
          },
          parameters: {
            confidenceLevel: 0.95,
            forecastHorizon: 30
          }
        }
      }

      const mockResult = {
        rows: [{
          id: 'config-123',
          created_at: new Date(),
          updated_at: new Date()
        }]
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockResult) // INSERT
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.createConfiguration(request, userId)

      expect(result.validation.isValid).toBe(true)
      expect(result.validation.warnings).toHaveLength(1)
      expect(result.validation.warnings[0].field).toBe('filters.dateRange')
    })
  })

  describe('searchConfigurations', () => {
    it('should search configurations with filters', async () => {
      const filters: ConfigurationSearchFilters = {
        name: 'test',
        isTemplate: false,
        tags: ['production', 'daily']
      }

      const mockCountResult = { rows: [{ count: '5' }] }
      const mockDataResult = {
        rows: [
          {
            id: 'config-1',
            name: 'Test Config 1',
            description: 'Description 1',
            filters: '{"clientIds": ["client-1"]}',
            parameters: '{"confidenceLevel": 0.95}',
            scenario_variables: null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: userId,
            is_template: false,
            tags: '["production", "daily"]'
          }
        ]
      }

      mockClient.query
        .mockResolvedValueOnce(mockCountResult) // COUNT query
        .mockResolvedValueOnce(mockDataResult) // SELECT query

      const result = await service.searchConfigurations(filters, userId, 1, 20)

      expect(result.total).toBe(5)
      expect(result.configurations).toHaveLength(1)
      expect(result.configurations[0].name).toBe('Test Config 1')
      expect(result.configurations[0].tags).toEqual(['production', 'daily'])
    })

    it('should handle empty search results', async () => {
      const filters: ConfigurationSearchFilters = {
        name: 'nonexistent'
      }

      const mockCountResult = { rows: [{ count: '0' }] }
      const mockDataResult = { rows: [] }

      mockClient.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult)

      const result = await service.searchConfigurations(filters, userId, 1, 20)

      expect(result.total).toBe(0)
      expect(result.configurations).toHaveLength(0)
    })
  })

  describe('updateConfiguration', () => {
    it('should update an existing configuration', async () => {
      const updates = {
        name: 'Updated Configuration',
        description: 'Updated description'
      }

      const mockResult = {
        rows: [{
          id: 'config-123',
          name: 'Updated Configuration',
          description: 'Updated description',
          filters: '{"clientIds": ["client-1"]}',
          parameters: '{"confidenceLevel": 0.95}',
          scenario_variables: null,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: userId,
          is_template: false,
          tags: '[]'
        }]
      }

      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.updateConfiguration('config-123', updates, userId)

      expect(result.name).toBe('Updated Configuration')
      expect(result.description).toBe('Updated description')
    })

    it('should throw error when configuration not found', async () => {
      const updates = { name: 'Updated Configuration' }
      const mockResult = { rows: [] }

      mockClient.query.mockResolvedValueOnce(mockResult)

      await expect(
        service.updateConfiguration('nonexistent', updates, userId)
      ).rejects.toThrow('Configuration not found or access denied')
    })
  })

  describe('getConfiguration', () => {
    it('should retrieve configuration by ID', async () => {
      const mockResult = {
        rows: [{
          id: 'config-123',
          name: 'Test Configuration',
          description: 'Test description',
          filters: '{"clientIds": ["client-1"]}',
          parameters: '{"confidenceLevel": 0.95}',
          scenario_variables: null,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: userId,
          is_template: false,
          tags: '["test"]'
        }]
      }

      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.getConfiguration('config-123', userId)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('config-123')
      expect(result!.name).toBe('Test Configuration')
    })

    it('should return null when configuration not found', async () => {
      const mockResult = { rows: [] }
      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.getConfiguration('nonexistent', userId)

      expect(result).toBeNull()
    })
  })

  describe('deleteConfiguration', () => {
    it('should delete configuration successfully', async () => {
      const mockResult = { rowCount: 1 }
      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.deleteConfiguration('config-123', userId)

      expect(result).toBe(true)
    })

    it('should return false when configuration not found', async () => {
      const mockResult = { rowCount: 0 }
      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.deleteConfiguration('nonexistent', userId)

      expect(result).toBe(false)
    })
  })

  describe('cloneAsTemplate', () => {
    it('should clone configuration as template', async () => {
      // Mock getting original configuration
      const originalConfig = {
        id: 'config-123',
        name: 'Original Configuration',
        description: 'Original description',
        filters: { clientIds: ['client-1'] },
        parameters: { confidenceLevel: 0.95, forecastHorizon: 30 },
        createdBy: userId,
        isTemplate: false,
        tags: ['original']
      }

      // Mock the service methods
      jest.spyOn(service, 'getConfiguration').mockResolvedValueOnce(originalConfig)
      jest.spyOn(service, 'createConfiguration').mockResolvedValueOnce({
        config: {
          ...originalConfig,
          id: 'template-456',
          name: 'Template Configuration',
          isTemplate: true
        },
        validation: { isValid: true, errors: [], warnings: [] }
      })

      const result = await service.cloneAsTemplate('config-123', 'Template Configuration', userId)

      expect(result.name).toBe('Template Configuration')
      expect(result.isTemplate).toBe(true)
      expect(result.id).toBe('template-456')
    })

    it('should throw error when original configuration not found', async () => {
      jest.spyOn(service, 'getConfiguration').mockResolvedValueOnce(null)

      await expect(
        service.cloneAsTemplate('nonexistent', 'Template Name', userId)
      ).rejects.toThrow('Configuration not found')
    })
  })

  describe('getPopularTemplates', () => {
    it('should retrieve popular templates', async () => {
      const mockResult = {
        rows: [
          {
            id: 'template-1',
            name: 'Popular Template',
            description: 'Most used template',
            filters: '{}',
            parameters: '{"confidenceLevel": 0.95}',
            scenario_variables: null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'system',
            is_template: true,
            tags: '["popular"]',
            usage_count: '25'
          }
        ]
      }

      mockClient.query.mockResolvedValueOnce(mockResult)

      const result = await service.getPopularTemplates(10)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Popular Template')
      expect(result[0].usageCount).toBe(25)
      expect(result[0].isTemplate).toBe(true)
    })
  })
})