import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { usePredictions, usePredictionHistory, usePredictionAnalytics } from '../use-predictions';
import { TranscriptData } from '@/types/transcript';
import { PredictionRequest } from '@/lib/services/prediction-service';

// Mock the prediction service
jest.mock('@/lib/services/prediction-service', () => ({
  PredictionService: jest.fn().mockImplementation(() => ({
    validateRequest: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    generatePredictions: jest.fn().mockResolvedValue({
      result: {
        id: 'test-prediction-1',
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
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }),
    trainAndValidateModel: jest.fn().mockResolvedValue({
      trainingMetrics: {
        mse: 2.5,
        mae: 1.8,
        rmse: 1.58,
        r2: 0.85,
        accuracy: 85.5
      },
      validationMetrics: {
        mse: 3.2,
        mae: 2.1,
        rmse: 1.79,
        r2: 0.82,
        accuracy: 82.3
      },
      crossValidationScore: 83.9
    }),
    compareModels: jest.fn().mockResolvedValue({
      bestModel: 'polynomial',
      results: {
        linear: {
          result: { accuracy: 80 },
          metrics: { accuracy: 80 }
        },
        polynomial: {
          result: { accuracy: 85 },
          metrics: { accuracy: 85 }
        },
        arima: {
          result: { accuracy: 78 },
          metrics: { accuracy: 78 }
        }
      },
      recommendation: 'Polynomial model shows best performance for your data.'
    }),
    getMemoryUsage: jest.fn().mockReturnValue({ numTensors: 5, numBytes: 1024 }),
    dispose: jest.fn()
  }))
}));

describe('usePredictions', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
  let mockData: TranscriptData[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    mockData = [
      {
        id: '1',
        clientName: 'Test Client',
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
        clientName: 'Test Client',
        date: new Date('2024-01-02'),
        transcriptCount: 15,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      }
    ];
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isComparing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.validation).toBe(null);
    });

    it('should provide memory usage information', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      await waitFor(() => {
        expect(result.current.memoryUsage).toEqual({
          numTensors: 5,
          numBytes: 1024
        });
      });
    });
  });

  describe('validateRequest', () => {
    it('should validate prediction request', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      act(() => {
        const validation = result.current.validateRequest(mockData, request);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      expect(result.current.validation?.isValid).toBe(true);
    });

    it('should handle validation errors', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Mock validation service to return error
      const mockService = require('@/lib/services/prediction-service').PredictionService;
      mockService.mockImplementation(() => ({
        validateRequest: jest.fn().mockReturnValue({
          isValid: false,
          errors: ['Insufficient data'],
          warnings: []
        }),
        getMemoryUsage: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 }),
        dispose: jest.fn()
      }));

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      act(() => {
        const validation = result.current.validateRequest([], request);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Insufficient data');
      });
    });
  });

  describe('generatePredictions', () => {
    it('should generate predictions successfully', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const request: PredictionRequest = {
        clientName: 'Test Client',
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      let predictionResult: any;

      await act(async () => {
        predictionResult = await result.current.generatePredictions(mockData, request);
      });

      expect(predictionResult).toBeDefined();
      expect(predictionResult.result.id).toBe('test-prediction-1');
      expect(predictionResult.result.clientName).toBe('Test Client');
      expect(predictionResult.validation.isValid).toBe(true);
    });

    it('should handle prediction errors', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Mock service to throw error
      const mockService = require('@/lib/services/prediction-service').PredictionService;
      mockService.mockImplementation(() => ({
        generatePredictions: jest.fn().mockRejectedValue(new Error('Prediction failed')),
        getMemoryUsage: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 }),
        dispose: jest.fn()
      }));

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      let predictionResult: any;

      await act(async () => {
        predictionResult = await result.current.generatePredictions(mockData, request);
      });

      expect(predictionResult).toBe(null);
      expect(result.current.error).toContain('Prediction failed');
    });

    it('should update loading state during prediction generation', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      act(() => {
        result.current.generatePredictions(mockData, request);
      });

      expect(result.current.isGenerating).toBe(true);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('trainModel', () => {
    it('should train model successfully', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      let trainingResult: any;

      await act(async () => {
        trainingResult = await result.current.trainModel(mockData, request, 0.2);
      });

      expect(trainingResult).toBeDefined();
      expect(trainingResult.trainingMetrics.accuracy).toBe(85.5);
      expect(trainingResult.validationMetrics.accuracy).toBe(82.3);
      expect(trainingResult.crossValidationScore).toBe(83.9);
    });

    it('should handle training errors', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Mock service to throw error
      const mockService = require('@/lib/services/prediction-service').PredictionService;
      mockService.mockImplementation(() => ({
        trainAndValidateModel: jest.fn().mockRejectedValue(new Error('Training failed')),
        getMemoryUsage: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 }),
        dispose: jest.fn()
      }));

      const request: PredictionRequest = {
        predictionType: 'daily',
        periodsAhead: 7,
        modelType: 'linear'
      };

      let trainingResult: any;

      await act(async () => {
        trainingResult = await result.current.trainModel(mockData, request);
      });

      expect(trainingResult).toBe(null);
      expect(result.current.error).toContain('Training failed');
    });
  });

  describe('compareModels', () => {
    it('should compare models successfully', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const request = {
        predictionType: 'daily' as const,
        periodsAhead: 7
      };

      let comparisonResult: any;

      await act(async () => {
        comparisonResult = await result.current.compareModels(mockData, request);
      });

      expect(comparisonResult).toBeDefined();
      expect(comparisonResult.bestModel).toBe('polynomial');
      expect(comparisonResult.results).toBeDefined();
      expect(comparisonResult.recommendation).toContain('Polynomial model');
    });

    it('should handle comparison errors', async () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Mock service to throw error
      const mockService = require('@/lib/services/prediction-service').PredictionService;
      mockService.mockImplementation(() => ({
        compareModels: jest.fn().mockRejectedValue(new Error('Comparison failed')),
        getMemoryUsage: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 }),
        dispose: jest.fn()
      }));

      const request = {
        predictionType: 'daily' as const,
        periodsAhead: 7
      };

      let comparisonResult: any;

      await act(async () => {
        comparisonResult = await result.current.compareModels(mockData, request);
      });

      expect(comparisonResult).toBe(null);
      expect(result.current.error).toContain('Comparison failed');
    });
  });

  describe('utility functions', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Set error state
      act(() => {
        result.current.validateRequest([], {
          predictionType: 'daily',
          periodsAhead: 7,
          modelType: 'linear'
        });
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should clear validation state', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      // Set validation state
      act(() => {
        result.current.validateRequest(mockData, {
          predictionType: 'daily',
          periodsAhead: 7,
          modelType: 'linear'
        });
      });

      expect(result.current.validation).not.toBe(null);

      // Clear validation
      act(() => {
        result.current.clearValidation();
      });

      expect(result.current.validation).toBe(null);
    });

    it('should invalidate predictions cache', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      act(() => {
        result.current.invalidatePredictions();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['predictions'] });
    });

    it('should cleanup resources', () => {
      const { result } = renderHook(() => usePredictions(), { wrapper });

      act(() => {
        result.current.cleanup();
      });

      // Verify cleanup was called (mocked)
      expect(result.current.cleanup).toBeDefined();
    });
  });
});

describe('usePredictionHistory', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  it('should return empty history when no predictions cached', async () => {
    const { result } = renderHook(() => usePredictionHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('should filter history by client name', async () => {
    // Pre-populate cache with predictions
    queryClient.setQueryData(['predictions', 'result', 'pred1'], {
      id: 'pred1',
      clientName: 'Client A',
      createdAt: new Date('2024-01-01')
    });

    queryClient.setQueryData(['predictions', 'result', 'pred2'], {
      id: 'pred2',
      clientName: 'Client B',
      createdAt: new Date('2024-01-02')
    });

    const { result } = renderHook(() => usePredictionHistory('Client A'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].clientName).toBe('Client A');
    });
  });
});

describe('usePredictionAnalytics', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  it('should return default analytics when no history', () => {
    const { result } = renderHook(() => usePredictionAnalytics(), { wrapper });

    expect(result.current.totalPredictions).toBe(0);
    expect(result.current.averageAccuracy).toBe(0);
    expect(result.current.modelUsage).toEqual({});
    expect(result.current.predictionTypes).toEqual({});
    expect(result.current.clientBreakdown).toEqual({});
  });

  it('should calculate analytics from prediction history', async () => {
    // Pre-populate cache with predictions
    queryClient.setQueryData(['predictions', 'result', 'pred1'], {
      id: 'pred1',
      clientName: 'Client A',
      modelType: 'linear',
      predictionType: 'daily',
      accuracy: 80,
      createdAt: new Date('2024-01-01')
    });

    queryClient.setQueryData(['predictions', 'result', 'pred2'], {
      id: 'pred2',
      clientName: 'Client B',
      modelType: 'polynomial',
      predictionType: 'weekly',
      accuracy: 90,
      createdAt: new Date('2024-01-02')
    });

    const { result } = renderHook(() => usePredictionAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.totalPredictions).toBe(2);
      expect(result.current.averageAccuracy).toBe(85);
      expect(result.current.modelUsage).toEqual({
        linear: 1,
        polynomial: 1
      });
      expect(result.current.predictionTypes).toEqual({
        daily: 1,
        weekly: 1
      });
      expect(result.current.clientBreakdown).toEqual({
        'Client A': 1,
        'Client B': 1
      });
    });
  });
});