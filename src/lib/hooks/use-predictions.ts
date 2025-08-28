import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { TranscriptData } from '@/types/transcript';
import { 
  PredictionService, 
  PredictionRequest, 
  ValidationResult 
} from '@/lib/services/prediction-service';
import { 
  PredictionResult, 
  ModelMetrics 
} from '@/lib/services/prediction-engine';

export interface UsePredictionsOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export interface PredictionState {
  isGenerating: boolean;
  isValidating: boolean;
  isComparing: boolean;
  error: string | null;
  validation: ValidationResult | null;
  memoryUsage: { numTensors: number; numBytes: number } | null;
}

export interface ModelComparison {
  bestModel: 'linear' | 'polynomial' | 'arima';
  results: Record<string, { result: PredictionResult; metrics: ModelMetrics }>;
  recommendation: string;
}

export interface TrainingResults {
  trainingMetrics: ModelMetrics;
  validationMetrics: ModelMetrics;
  crossValidationScore: number;
}

const predictionService = new PredictionService();

export function usePredictions(options: UsePredictionsOptions = {}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PredictionState>({
    isGenerating: false,
    isValidating: false,
    isComparing: false,
    error: null,
    validation: null,
    memoryUsage: null
  });

  // Query for memory usage monitoring
  const { data: memoryUsage } = useQuery({
    queryKey: ['predictions', 'memory'],
    queryFn: () => predictionService.getMemoryUsage(),
    refetchInterval: 5000, // Update every 5 seconds
    enabled: options.enabled !== false,
    staleTime: options.staleTime || 1000 * 60, // 1 minute
    gcTime: options.cacheTime || 1000 * 60 * 5 // 5 minutes
  });

  // Mutation for generating predictions
  const generatePredictionsMutation = useMutation({
    mutationFn: async ({ 
      data, 
      request 
    }: { 
      data: TranscriptData[]; 
      request: PredictionRequest; 
    }) => {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));
      
      try {
        const result = await predictionService.generatePredictions(data, request);
        setState(prev => ({ 
          ...prev, 
          validation: result.validation,
          memoryUsage: predictionService.getMemoryUsage()
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, isGenerating: false }));
      }
    },
    onSuccess: (data) => {
      // Cache the prediction result
      queryClient.setQueryData(
        ['predictions', 'result', data.result.id], 
        data.result
      );
    }
  });

  // Mutation for model training and validation
  const trainModelMutation = useMutation({
    mutationFn: async ({ 
      data, 
      request, 
      validationSplit 
    }: { 
      data: TranscriptData[]; 
      request: PredictionRequest; 
      validationSplit?: number; 
    }) => {
      setState(prev => ({ ...prev, isValidating: true, error: null }));
      
      try {
        const result = await predictionService.trainAndValidateModel(
          data, 
          request, 
          validationSplit
        );
        setState(prev => ({ 
          ...prev, 
          memoryUsage: predictionService.getMemoryUsage()
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, isValidating: false }));
      }
    }
  });

  // Mutation for comparing models
  const compareModelsMutation = useMutation({
    mutationFn: async ({ 
      data, 
      request 
    }: { 
      data: TranscriptData[]; 
      request: Omit<PredictionRequest, 'modelType'>; 
    }) => {
      setState(prev => ({ ...prev, isComparing: true, error: null }));
      
      try {
        const result = await predictionService.compareModels(data, request);
        setState(prev => ({ 
          ...prev, 
          memoryUsage: predictionService.getMemoryUsage()
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, isComparing: false }));
      }
    }
  });

  // Validate prediction request
  const validateRequest = useCallback((
    data: TranscriptData[], 
    request: PredictionRequest
  ): ValidationResult => {
    try {
      const validation = predictionService.validateRequest(data, request);
      setState(prev => ({ ...prev, validation, error: null }));
      return validation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation error';
      setState(prev => ({ ...prev, error: errorMessage }));
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, []);

  // Generate predictions
  const generatePredictions = useCallback(async (
    data: TranscriptData[], 
    request: PredictionRequest
  ): Promise<{ result: PredictionResult; validation: ValidationResult } | null> => {
    try {
      const result = await generatePredictionsMutation.mutateAsync({ data, request });
      return result;
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      return null;
    }
  }, [generatePredictionsMutation]);

  // Train and validate model
  const trainModel = useCallback(async (
    data: TranscriptData[], 
    request: PredictionRequest,
    validationSplit?: number
  ): Promise<TrainingResults | null> => {
    try {
      const result = await trainModelMutation.mutateAsync({ 
        data, 
        request, 
        validationSplit 
      });
      return result;
    } catch (error) {
      console.error('Failed to train model:', error);
      return null;
    }
  }, [trainModelMutation]);

  // Compare models
  const compareModels = useCallback(async (
    data: TranscriptData[], 
    request: Omit<PredictionRequest, 'modelType'>
  ): Promise<ModelComparison | null> => {
    try {
      const result = await compareModelsMutation.mutateAsync({ data, request });
      return result;
    } catch (error) {
      console.error('Failed to compare models:', error);
      return null;
    }
  }, [compareModelsMutation]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setState(prev => ({ ...prev, validation: null }));
  }, []);

  // Get cached prediction result
  const getCachedPrediction = useCallback((predictionId: string) => {
    return queryClient.getQueryData<PredictionResult>([
      'predictions', 
      'result', 
      predictionId
    ]);
  }, [queryClient]);

  // Invalidate prediction cache
  const invalidatePredictions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['predictions'] });
  }, [queryClient]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    predictionService.dispose();
  }, []);

  return {
    // State
    ...state,
    memoryUsage,
    
    // Actions
    validateRequest,
    generatePredictions,
    trainModel,
    compareModels,
    clearError,
    clearValidation,
    getCachedPrediction,
    invalidatePredictions,
    cleanup,
    
    // Mutation states
    isGenerating: generatePredictionsMutation.isPending,
    isValidating: trainModelMutation.isPending,
    isComparing: compareModelsMutation.isPending,
    
    // Mutation results
    lastPrediction: generatePredictionsMutation.data,
    lastTraining: trainModelMutation.data,
    lastComparison: compareModelsMutation.data
  };
}

// Hook for prediction history
export function usePredictionHistory(clientName?: string) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['predictions', 'history', clientName],
    queryFn: async () => {
      // This would typically fetch from an API endpoint
      // For now, return cached predictions
      const cache = queryClient.getQueryCache();
      const predictions: PredictionResult[] = [];
      
      cache.getAll().forEach(query => {
        if (query.queryKey[0] === 'predictions' && 
            query.queryKey[1] === 'result' &&
            query.state.data) {
          const prediction = query.state.data as PredictionResult;
          if (!clientName || prediction.clientName === clientName) {
            predictions.push(prediction);
          }
        }
      });
      
      return predictions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  });
}

// Hook for prediction analytics
export function usePredictionAnalytics() {
  const { data: history } = usePredictionHistory();
  
  const analytics = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        totalPredictions: 0,
        averageAccuracy: 0,
        modelUsage: {},
        predictionTypes: {},
        clientBreakdown: {}
      };
    }
    
    const totalPredictions = history.length;
    const averageAccuracy = history.reduce((sum, p) => sum + p.accuracy, 0) / totalPredictions;
    
    const modelUsage = history.reduce((acc, p) => {
      acc[p.modelType] = (acc[p.modelType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const predictionTypes = history.reduce((acc, p) => {
      acc[p.predictionType] = (acc[p.predictionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const clientBreakdown = history.reduce((acc, p) => {
      acc[p.clientName] = (acc[p.clientName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalPredictions,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      modelUsage,
      predictionTypes,
      clientBreakdown
    };
  }, [history]);
  
  return analytics;
}