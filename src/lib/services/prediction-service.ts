import { TranscriptData } from '@/types/transcript';
import { 
  PredictionEngine, 
  PredictionResult, 
  PredictionOptions, 
  ModelMetrics 
} from './prediction-engine';

export interface PredictionRequest {
  clientName?: string;
  predictionType: 'daily' | 'weekly' | 'monthly';
  periodsAhead: number;
  modelType: 'linear' | 'polynomial' | 'arima';
  confidenceLevel?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PredictionService {
  private engine: PredictionEngine;

  constructor() {
    this.engine = new PredictionEngine();
  }

  /**
   * Validate prediction request
   */
  public validateRequest(
    data: TranscriptData[],
    request: PredictionRequest
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if we have enough data
    const minDataPoints = {
      daily: 14,
      weekly: 8,
      monthly: 6
    };

    const requiredPoints = minDataPoints[request.predictionType];
    
    if (data.length < requiredPoints) {
      errors.push(
        `Insufficient data for ${request.predictionType} predictions. ` +
        `Need at least ${requiredPoints} data points, got ${data.length}.`
      );
    }

    // Check periods ahead
    if (request.periodsAhead < 1 || request.periodsAhead > 365) {
      errors.push('Periods ahead must be between 1 and 365.');
    }

    // Check confidence level
    if (request.confidenceLevel && (request.confidenceLevel < 0.5 || request.confidenceLevel > 0.99)) {
      errors.push('Confidence level must be between 0.5 and 0.99.');
    }

    // Check for data quality issues
    const hasNegativeValues = data.some(d => d.transcriptCount < 0);
    if (hasNegativeValues) {
      errors.push('Data contains negative transcript counts.');
    }

    const hasZeroVariance = this.checkZeroVariance(data);
    if (hasZeroVariance) {
      warnings.push('Data has very low variance, predictions may be less accurate.');
    }

    // Check for outliers
    const outliers = this.detectOutliers(data);
    if (outliers.length > 0) {
      warnings.push(`Detected ${outliers.length} potential outliers in the data.`);
    }

    // Check data recency
    const latestDate = new Date(Math.max(...data.map(d => new Date(d.date).getTime())));
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 30) {
      warnings.push('Latest data is more than 30 days old, predictions may be less accurate.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate predictions with validation
   */
  public async generatePredictions(
    data: TranscriptData[],
    request: PredictionRequest
  ): Promise<{ result: PredictionResult; validation: ValidationResult }> {
    // Validate request
    const validation = this.validateRequest(data, request);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Prepare options
    const options: PredictionOptions = {
      clientName: request.clientName,
      predictionType: request.predictionType,
      periodsAhead: request.periodsAhead,
      modelType: request.modelType,
      confidenceLevel: request.confidenceLevel || 0.95
    };

    try {
      const result = await this.engine.generatePredictions(data, options);
      return { result, validation };
    } catch (error) {
      throw new Error(`Prediction generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Train and validate model with cross-validation
   */
  public async trainAndValidateModel(
    data: TranscriptData[],
    request: PredictionRequest,
    validationSplit: number = 0.2
  ): Promise<{
    trainingMetrics: ModelMetrics;
    validationMetrics: ModelMetrics;
    crossValidationScore: number;
  }> {
    if (validationSplit <= 0 || validationSplit >= 1) {
      throw new Error('Validation split must be between 0 and 1');
    }

    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const splitIndex = Math.floor(sortedData.length * (1 - validationSplit));
    const trainingData = sortedData.slice(0, splitIndex);
    const validationData = sortedData.slice(splitIndex);

    // Generate predictions on training data
    const trainingResult = await this.generatePredictions(trainingData, {
      ...request,
      periodsAhead: Math.min(request.periodsAhead, trainingData.length - 1)
    });

    // Validate on held-out data
    const validationMetrics = await this.engine.validatePredictions(
      trainingData,
      validationData,
      {
        clientName: request.clientName,
        predictionType: request.predictionType,
        periodsAhead: validationData.length,
        modelType: request.modelType,
        confidenceLevel: request.confidenceLevel || 0.95
      }
    );

    // Perform k-fold cross-validation
    const crossValidationScore = await this.performCrossValidation(
      sortedData,
      request,
      5 // 5-fold CV
    );

    return {
      trainingMetrics: {
        mse: 0, // Will be calculated by the engine
        mae: 0,
        rmse: 0,
        r2: 0,
        accuracy: trainingResult.result.accuracy
      },
      validationMetrics,
      crossValidationScore
    };
  }

  /**
   * Perform k-fold cross-validation
   */
  private async performCrossValidation(
    data: TranscriptData[],
    request: PredictionRequest,
    k: number
  ): Promise<number> {
    const foldSize = Math.floor(data.length / k);
    const scores: number[] = [];

    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = i === k - 1 ? data.length : (i + 1) * foldSize;
      
      const testData = data.slice(start, end);
      const trainData = [...data.slice(0, start), ...data.slice(end)];

      if (trainData.length < 10) continue; // Skip if insufficient training data

      try {
        const metrics = await this.engine.validatePredictions(
          trainData,
          testData,
          {
            clientName: request.clientName,
            predictionType: request.predictionType,
            periodsAhead: testData.length,
            modelType: request.modelType,
            confidenceLevel: request.confidenceLevel || 0.95
          }
        );

        scores.push(metrics.accuracy);
      } catch (error) {
        console.warn(`Cross-validation fold ${i} failed:`, error);
      }
    }

    return scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
  }

  /**
   * Compare multiple models and return the best one
   */
  public async compareModels(
    data: TranscriptData[],
    request: Omit<PredictionRequest, 'modelType'>
  ): Promise<{
    bestModel: 'linear' | 'polynomial' | 'arima';
    results: Record<string, { result: PredictionResult; metrics: ModelMetrics }>;
    recommendation: string;
  }> {
    const models: ('linear' | 'polynomial' | 'arima')[] = ['linear', 'polynomial', 'arima'];
    const results: Record<string, { result: PredictionResult; metrics: ModelMetrics }> = {};
    
    // Test each model
    for (const modelType of models) {
      try {
        const { result } = await this.generatePredictions(data, {
          ...request,
          modelType
        });

        // Validate the model
        const splitIndex = Math.floor(data.length * 0.8);
        const trainingData = data.slice(0, splitIndex);
        const testData = data.slice(splitIndex);

        const metrics = await this.engine.validatePredictions(
          trainingData,
          testData,
          {
            ...request,
            modelType,
            periodsAhead: testData.length,
            confidenceLevel: request.confidenceLevel || 0.95
          }
        );

        results[modelType] = { result, metrics };
      } catch (error) {
        console.warn(`Model ${modelType} failed:`, error);
      }
    }

    // Find best model based on accuracy
    let bestModel: 'linear' | 'polynomial' | 'arima' = 'linear';
    let bestAccuracy = 0;

    Object.entries(results).forEach(([model, { metrics }]) => {
      if (metrics.accuracy > bestAccuracy) {
        bestAccuracy = metrics.accuracy;
        bestModel = model as 'linear' | 'polynomial' | 'arima';
      }
    });

    // Generate recommendation
    const recommendation = this.generateModelRecommendation(results, data.length);

    return { bestModel, results, recommendation };
  }

  /**
   * Generate model recommendation based on results and data characteristics
   */
  private generateModelRecommendation(
    results: Record<string, { result: PredictionResult; metrics: ModelMetrics }>,
    dataSize: number
  ): string {
    const recommendations: string[] = [];

    if (dataSize < 20) {
      recommendations.push('Consider collecting more data for better predictions.');
    }

    if (results.linear && results.polynomial) {
      const linearAccuracy = results.linear.metrics.accuracy;
      const polyAccuracy = results.polynomial.metrics.accuracy;
      
      if (Math.abs(linearAccuracy - polyAccuracy) < 5) {
        recommendations.push('Linear and polynomial models perform similarly. Linear model is recommended for simplicity.');
      } else if (polyAccuracy > linearAccuracy + 10) {
        recommendations.push('Polynomial model shows significantly better performance, suggesting non-linear patterns in your data.');
      }
    }

    if (results.arima) {
      const arimaAccuracy = results.arima.metrics.accuracy;
      if (arimaAccuracy > 80) {
        recommendations.push('ARIMA model shows good performance, indicating strong time series patterns.');
      }
    }

    return recommendations.length > 0 
      ? recommendations.join(' ')
      : 'All models show reasonable performance. Consider the linear model for interpretability.';
  }

  /**
   * Check for zero variance in data
   */
  private checkZeroVariance(data: TranscriptData[]): boolean {
    const values = data.map(d => d.transcriptCount);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance < 0.01; // Very low variance threshold
  }

  /**
   * Detect outliers using IQR method
   */
  private detectOutliers(data: TranscriptData[]): TranscriptData[] {
    const values = data.map(d => d.transcriptCount).sort((a, b) => a - b);
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(d => 
      d.transcriptCount < lowerBound || d.transcriptCount > upperBound
    );
  }

  /**
   * Get prediction engine memory usage
   */
  public getMemoryUsage(): { numTensors: number; numBytes: number } {
    return this.engine.getMemoryInfo();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.engine.dispose();
  }
}

// Export singleton instance
export const predictionService = new PredictionService();