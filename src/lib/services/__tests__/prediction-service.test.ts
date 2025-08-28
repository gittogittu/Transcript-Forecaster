import { PredictionService, PredictionRequest } from '../prediction-service';
import { TranscriptData } from '@/types/transcript';

// Mock the prediction engine
jest.mock('../prediction-engine', () => ({
  PredictionEngine: jest.fn().mockImplementation(() => ({
    generatePredictions: jest.fn().mockResolvedValue({
      id: 'test-prediction',
      clientName: 'Test Client',
      predictionType: 'daily',
      predictions: [
        {
          date: new Date('2024-01-06'),
          predictedCount: 25,
          confidenceInterval: { lower: 20, upper: 30 }
        }
      ],
      confidence: 0.95,
      accuracy: 85.5,
      modelType: 'linear',
      createdAt: new Date()
    }),
    validatePredictions: jest.fn().mockResolvedValue({
      mse: 2.5,
      mae: 1.8,
      rmse: 1.58,
      r2: 0.85,
      accuracy: 85.5
    }),
    getMemoryInfo: jest.fn().mockReturnValue({ numTensors: 5, numBytes: 1024 }),
    dispose: jest.fn()
  }))
}));

describe('PredictionService', () => {
  let service: PredictionService;
  let mockData: TranscriptData[];

  beforeEach(() => {
    service = new PredictionService();
    
    // Create comprehensive mock data
    mockData = Array.from({ length: 30 }, (_, i) => ({
      id: `${i + 1}`,
      clientName: 'Test Client',
      date: new Date(2024, 0, i + 1), // January 1-30, 2024
      transcriptCount: 10 + Math.floor(Math.random() * 20), // Random between 10-30
      transcriptType: 'type1',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1'
    }));
  });

  afterEach(() => {
    service.dispose();
  });

  describe('validateRequest', () => {
    const baseRequest: PredictionRequest = {
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear'
    };

    it('should validate a valid request', () => {
      const result = service.validateRequest(mockData, baseRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject request with insufficient data for daily predictions', () => {
      const smallData = mockData.slice(0, 10); // Less than 14 required
      const result = service.validateRequest(smallData, baseRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Insufficient data for daily predictions')
      );
    });

    it('should reject request with insufficient data for weekly predictions', () => {
      const smallData = mockData.slice(0, 5); // Less than 8 required
      const weeklyRequest = { ...baseRequest, predictionType: 'weekly' as const };
      const result = service.validateRequest(smallData, weeklyRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Insufficient data for weekly predictions')
      );
    });

    it('should reject request with insufficient data for monthly predictions', () => {
      const smallData = mockData.slice(0, 3); // Less than 6 required
      const monthlyRequest = { ...baseRequest, predictionType: 'monthly' as const };
      const result = service.validateRequest(smallData, monthlyRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Insufficient data for monthly predictions')
      );
    });

    it('should reject invalid periods ahead', () => {
      const invalidRequest = { ...baseRequest, periodsAhead: 0 };
      const result = service.validateRequest(mockData, invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Periods ahead must be between 1 and 365.');
    });

    it('should reject invalid confidence level', () => {
      const invalidRequest = { ...baseRequest, confidenceLevel: 1.5 };
      const result = service.validateRequest(mockData, invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence level must be between 0.5 and 0.99.');
    });

    it('should detect negative transcript counts', () => {
      const dataWithNegatives = [...mockData];
      dataWithNegatives[0].transcriptCount = -5;
      
      const result = service.validateRequest(dataWithNegatives, baseRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data contains negative transcript counts.');
    });

    it('should warn about zero variance data', () => {
      const constantData = mockData.map(d => ({ ...d, transcriptCount: 10 }));
      const result = service.validateRequest(constantData, baseRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('Data has very low variance')
      );
    });

    it('should warn about old data', () => {
      const oldData = mockData.map(d => ({
        ...d,
        date: new Date(2023, 0, 1) // Old date
      }));
      
      const result = service.validateRequest(oldData, baseRequest);
      
      expect(result.warnings).toContain(
        expect.stringContaining('Latest data is more than 30 days old')
      );
    });

    it('should detect outliers', () => {
      const dataWithOutliers = [...mockData];
      dataWithOutliers[0].transcriptCount = 1000; // Extreme outlier
      
      const result = service.validateRequest(dataWithOutliers, baseRequest);
      
      expect(result.warnings).toContain(
        expect.stringContaining('Detected')
      );
      expect(result.warnings).toContain(
        expect.stringContaining('potential outliers')
      );
    });
  });

  describe('generatePredictions', () => {
    const validRequest: PredictionRequest = {
      clientName: 'Test Client',
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear',
      confidenceLevel: 0.95
    };

    it('should generate predictions for valid request', async () => {
      const result = await service.generatePredictions(mockData, validRequest);
      
      expect(result.result).toBeDefined();
      expect(result.result.id).toBe('test-prediction');
      expect(result.result.clientName).toBe('Test Client');
      expect(result.result.modelType).toBe('linear');
      expect(result.validation.isValid).toBe(true);
    });

    it('should throw error for invalid request', async () => {
      const invalidRequest = { ...validRequest, periodsAhead: 0 };
      
      await expect(service.generatePredictions(mockData, invalidRequest))
        .rejects.toThrow('Validation failed');
    });

    it('should handle different model types', async () => {
      const polynomialRequest = { ...validRequest, modelType: 'polynomial' as const };
      const arimaRequest = { ...validRequest, modelType: 'arima' as const };
      
      const polyResult = await service.generatePredictions(mockData, polynomialRequest);
      const arimaResult = await service.generatePredictions(mockData, arimaRequest);
      
      expect(polyResult.result).toBeDefined();
      expect(arimaResult.result).toBeDefined();
    });

    it('should handle different prediction types', async () => {
      const weeklyRequest = { ...validRequest, predictionType: 'weekly' as const };
      const monthlyRequest = { ...validRequest, predictionType: 'monthly' as const };
      
      const weeklyResult = await service.generatePredictions(mockData, weeklyRequest);
      const monthlyResult = await service.generatePredictions(mockData, monthlyRequest);
      
      expect(weeklyResult.result).toBeDefined();
      expect(monthlyResult.result).toBeDefined();
    });
  });

  describe('trainAndValidateModel', () => {
    const validRequest: PredictionRequest = {
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear'
    };

    it('should train and validate model with default split', async () => {
      const result = await service.trainAndValidateModel(mockData, validRequest);
      
      expect(result.trainingMetrics).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      expect(result.crossValidationScore).toBeDefined();
      expect(result.crossValidationScore).toBeGreaterThanOrEqual(0);
      expect(result.crossValidationScore).toBeLessThanOrEqual(100);
    });

    it('should train and validate model with custom split', async () => {
      const result = await service.trainAndValidateModel(mockData, validRequest, 0.3);
      
      expect(result.trainingMetrics).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      expect(result.crossValidationScore).toBeDefined();
    });

    it('should throw error for invalid validation split', async () => {
      await expect(service.trainAndValidateModel(mockData, validRequest, 0))
        .rejects.toThrow('Validation split must be between 0 and 1');
      
      await expect(service.trainAndValidateModel(mockData, validRequest, 1))
        .rejects.toThrow('Validation split must be between 0 and 1');
    });
  });

  describe('compareModels', () => {
    const baseRequest = {
      predictionType: 'daily' as const,
      periodsAhead: 7
    };

    it('should compare all available models', async () => {
      const result = await service.compareModels(mockData, baseRequest);
      
      expect(result.bestModel).toBeDefined();
      expect(['linear', 'polynomial', 'arima']).toContain(result.bestModel);
      expect(result.results).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
    });

    it('should handle model comparison with client filter', async () => {
      const clientRequest = { ...baseRequest, clientName: 'Test Client' };
      const result = await service.compareModels(mockData, clientRequest);
      
      expect(result.bestModel).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it('should provide meaningful recommendations', async () => {
      const result = await service.compareModels(mockData, baseRequest);
      
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      const memoryUsage = service.getMemoryUsage();
      
      expect(memoryUsage).toBeDefined();
      expect(memoryUsage.numTensors).toBe(5);
      expect(memoryUsage.numBytes).toBe(1024);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty data gracefully', async () => {
      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 1,
        modelType: 'linear'
      };

      await expect(service.generatePredictions([], request))
        .rejects.toThrow();
    });

    it('should handle data with missing values', () => {
      const dataWithMissing = [...mockData];
      dataWithMissing[0].transcriptCount = null as any;
      
      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      const validation = service.validateRequest(dataWithMissing, request);
      expect(validation.isValid).toBe(false);
    });

    it('should handle single data point', () => {
      const singlePoint = [mockData[0]];
      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 1,
        modelType: 'linear'
      };

      const validation = service.validateRequest(singlePoint, request);
      expect(validation.isValid).toBe(false);
    });

    it('should handle extreme periods ahead', () => {
      const extremeRequest: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 1000,
        modelType: 'linear'
      };

      const validation = service.validateRequest(mockData, extremeRequest);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('data quality checks', () => {
    it('should detect and report data quality issues', () => {
      // Create data with various quality issues
      const problematicData = [
        ...mockData.slice(0, 5),
        { ...mockData[0], transcriptCount: -10 }, // Negative value
        { ...mockData[1], transcriptCount: 1000 }, // Outlier
        { ...mockData[2], transcriptCount: null as any } // Missing value
      ];

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      const validation = service.validateRequest(problematicData, request);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for suboptimal data', () => {
      // Create data with low variance
      const lowVarianceData = mockData.map((d, i) => ({
        ...d,
        transcriptCount: 15 + (i % 2) // Very low variance
      }));

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      const validation = service.validateRequest(lowVarianceData, request);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});