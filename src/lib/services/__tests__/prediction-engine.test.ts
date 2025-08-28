import { PredictionEngine, PredictionOptions } from '../prediction-engine';
import { TranscriptData } from '@/types/transcript';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  setBackend: jest.fn().mockResolvedValue(undefined),
  tensor1d: jest.fn().mockReturnValue({
    dispose: jest.fn()
  }),
  tensor2d: jest.fn().mockReturnValue({
    dispose: jest.fn()
  }),
  tensor3d: jest.fn().mockReturnValue({
    dispose: jest.fn()
  }),
  sequential: jest.fn().mockReturnValue({
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({}),
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue([10, 15, 20]),
      dispose: jest.fn()
    }),
    dispose: jest.fn()
  }),
  layers: {
    dense: jest.fn().mockReturnValue({}),
    lstm: jest.fn().mockReturnValue({}),
    dropout: jest.fn().mockReturnValue({})
  },
  train: {
    adam: jest.fn().mockReturnValue({})
  },
  memory: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 })
}));

describe('PredictionEngine', () => {
  let engine: PredictionEngine;
  let mockData: TranscriptData[];

  beforeEach(() => {
    engine = new PredictionEngine();
    
    // Create mock data
    mockData = [
      {
        id: '1',
        clientName: 'Client A',
        date: new Date('2024-01-01'),
        transcriptCount: 10,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '2',
        clientName: 'Client A',
        date: new Date('2024-01-02'),
        transcriptCount: 12,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '3',
        clientName: 'Client A',
        date: new Date('2024-01-03'),
        transcriptCount: 15,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '4',
        clientName: 'Client A',
        date: new Date('2024-01-04'),
        transcriptCount: 18,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '5',
        clientName: 'Client A',
        date: new Date('2024-01-05'),
        transcriptCount: 20,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '6',
        clientName: 'Client B',
        date: new Date('2024-01-01'),
        transcriptCount: 5,
        transcriptType: 'type2',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      },
      {
        id: '7',
        clientName: 'Client B',
        date: new Date('2024-01-02'),
        transcriptCount: 8,
        transcriptType: 'type2',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      }
    ];
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('preprocessData', () => {
    it('should filter data by client name', () => {
      const result = engine.preprocessData(mockData, 'daily', 'Client A');
      
      expect(result.values).toHaveLength(5);
      expect(result.dates).toHaveLength(5);
      expect(result.values).toEqual([10, 12, 15, 18, 20]);
    });

    it('should process all clients when no client specified', () => {
      const result = engine.preprocessData(mockData, 'daily');
      
      expect(result.values).toHaveLength(7);
      expect(result.dates).toHaveLength(7);
    });

    it('should aggregate data by week', () => {
      const result = engine.preprocessData(mockData, 'weekly', 'Client A');
      
      // All data points are within the same week, so should be aggregated
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toBe(75); // Sum of 10+12+15+18+20
    });

    it('should aggregate data by month', () => {
      const result = engine.preprocessData(mockData, 'monthly', 'Client A');
      
      // All data points are within the same month, so should be aggregated
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toBe(75); // Sum of 10+12+15+18+20
    });

    it('should create sequences for time series', () => {
      const result = engine.preprocessData(mockData, 'daily', 'Client A');
      
      expect(result.processedData).toBeDefined();
      expect(result.processedData.length).toBeGreaterThan(0);
    });
  });

  describe('generatePredictions', () => {
    const options: PredictionOptions = {
      clientName: 'Client A',
      predictionType: 'daily',
      periodsAhead: 3,
      modelType: 'linear',
      confidenceLevel: 0.95
    };

    it('should generate linear regression predictions', async () => {
      const result = await engine.generatePredictions(mockData, options);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.clientName).toBe('Client A');
      expect(result.predictionType).toBe('daily');
      expect(result.modelType).toBe('linear');
      expect(result.predictions).toHaveLength(3);
      
      result.predictions.forEach(prediction => {
        expect(prediction.date).toBeInstanceOf(Date);
        expect(prediction.predictedCount).toBeGreaterThanOrEqual(0);
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedCount);
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedCount);
      });
    });

    it('should generate polynomial regression predictions', async () => {
      const polyOptions = { ...options, modelType: 'polynomial' as const };
      const result = await engine.generatePredictions(mockData, polyOptions);
      
      expect(result.modelType).toBe('polynomial');
      expect(result.predictions).toHaveLength(3);
    });

    it('should generate ARIMA predictions', async () => {
      const arimaOptions = { ...options, modelType: 'arima' as const };
      const result = await engine.generatePredictions(mockData, arimaOptions);
      
      expect(result.modelType).toBe('arima');
      expect(result.predictions).toHaveLength(3);
    });

    it('should handle weekly predictions', async () => {
      const weeklyOptions = { ...options, predictionType: 'weekly' as const };
      const result = await engine.generatePredictions(mockData, weeklyOptions);
      
      expect(result.predictionType).toBe('weekly');
      expect(result.predictions).toHaveLength(3);
    });

    it('should handle monthly predictions', async () => {
      const monthlyOptions = { ...options, predictionType: 'monthly' as const };
      const result = await engine.generatePredictions(mockData, monthlyOptions);
      
      expect(result.predictionType).toBe('monthly');
      expect(result.predictions).toHaveLength(3);
    });

    it('should throw error for unsupported model type', async () => {
      const invalidOptions = { ...options, modelType: 'invalid' as any };
      
      await expect(engine.generatePredictions(mockData, invalidOptions))
        .rejects.toThrow('Unsupported model type: invalid');
    });
  });

  describe('validatePredictions', () => {
    it('should validate predictions against test data', async () => {
      const trainingData = mockData.slice(0, 4);
      const testData = mockData.slice(4);
      
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'daily',
        periodsAhead: testData.length,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const metrics = await engine.validatePredictions(trainingData, testData, options);
      
      expect(metrics).toBeDefined();
      expect(metrics.mse).toBeGreaterThanOrEqual(0);
      expect(metrics.mae).toBeGreaterThanOrEqual(0);
      expect(metrics.rmse).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('getMemoryInfo', () => {
    it('should return memory usage information', () => {
      const memInfo = engine.getMemoryInfo();
      
      expect(memInfo).toBeDefined();
      expect(memInfo.numTensors).toBeDefined();
      expect(memInfo.numBytes).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', async () => {
      const options: PredictionOptions = {
        predictionType: 'daily',
        periodsAhead: 1,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      await expect(engine.generatePredictions([], options))
        .rejects.toThrow();
    });

    it('should handle insufficient data for ARIMA', async () => {
      const smallData = mockData.slice(0, 2);
      const options: PredictionOptions = {
        predictionType: 'daily',
        periodsAhead: 1,
        modelType: 'arima',
        confidenceLevel: 0.95
      };

      await expect(engine.generatePredictions(smallData, options))
        .rejects.toThrow('Insufficient data for ARIMA model');
    });

    it('should handle single client data', async () => {
      const singleClientData = mockData.filter(d => d.clientName === 'Client A');
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'daily',
        periodsAhead: 2,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(singleClientData, options);
      expect(result.predictions).toHaveLength(2);
    });

    it('should handle zero variance data', () => {
      const constantData = mockData.map(d => ({ ...d, transcriptCount: 10 }));
      const result = engine.preprocessData(constantData, 'daily');
      
      expect(result.values).toEqual([10, 10, 10, 10, 10, 10, 10]);
    });
  });

  describe('data normalization', () => {
    it('should normalize and denormalize data correctly', async () => {
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'daily',
        periodsAhead: 1,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(mockData, options);
      
      // Predictions should be reasonable (not negative, not extremely large)
      result.predictions.forEach(prediction => {
        expect(prediction.predictedCount).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedCount).toBeLessThan(1000); // Reasonable upper bound
      });
    });
  });

  describe('confidence intervals', () => {
    it('should generate valid confidence intervals', async () => {
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'daily',
        periodsAhead: 3,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(mockData, options);
      
      result.predictions.forEach(prediction => {
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedCount);
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedCount);
        expect(prediction.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('date handling', () => {
    it('should generate correct future dates for daily predictions', async () => {
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'daily',
        periodsAhead: 3,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(mockData, options);
      const lastDataDate = new Date('2024-01-05');
      
      result.predictions.forEach((prediction, index) => {
        const expectedDate = new Date(lastDataDate);
        expectedDate.setDate(expectedDate.getDate() + index + 1);
        expect(prediction.date.toDateString()).toBe(expectedDate.toDateString());
      });
    });

    it('should generate correct future dates for weekly predictions', async () => {
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'weekly',
        periodsAhead: 2,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(mockData, options);
      
      // Check that dates are spaced 7 days apart
      if (result.predictions.length > 1) {
        const firstDate = result.predictions[0].date;
        const secondDate = result.predictions[1].date;
        const daysDiff = (secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(7);
      }
    });

    it('should generate correct future dates for monthly predictions', async () => {
      const options: PredictionOptions = {
        clientName: 'Client A',
        predictionType: 'monthly',
        periodsAhead: 2,
        modelType: 'linear',
        confidenceLevel: 0.95
      };

      const result = await engine.generatePredictions(mockData, options);
      
      // Check that dates are in consecutive months
      if (result.predictions.length > 1) {
        const firstDate = result.predictions[0].date;
        const secondDate = result.predictions[1].date;
        expect(secondDate.getMonth()).toBe((firstDate.getMonth() + 1) % 12);
      }
    });
  });
});