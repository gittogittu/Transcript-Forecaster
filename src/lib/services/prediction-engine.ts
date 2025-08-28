import * as tf from '@tensorflow/tfjs';
import { TranscriptData } from '@/types/transcript';

export interface PredictionResult {
  id: string;
  clientName: string;
  predictionType: 'daily' | 'weekly' | 'monthly';
  predictions: TimePrediction[];
  confidence: number;
  accuracy: number;
  modelType: 'linear' | 'polynomial' | 'arima';
  createdAt: Date;
}

export interface TimePrediction {
  date: Date;
  predictedCount: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ModelMetrics {
  mse: number;
  mae: number;
  rmse: number;
  r2: number;
  accuracy: number;
}

export interface PredictionOptions {
  clientName?: string;
  predictionType: 'daily' | 'weekly' | 'monthly';
  periodsAhead: number;
  modelType: 'linear' | 'polynomial' | 'arima';
  confidenceLevel: number;
}

export class PredictionEngine {
  private models: Map<string, tf.LayersModel> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeTensorFlow();
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      // Set backend to webgl for better performance in browser
      await tf.setBackend('webgl');
      this.isInitialized = true;
    } catch (error) {
      console.warn('WebGL backend not available, falling back to CPU');
      await tf.setBackend('cpu');
      this.isInitialized = true;
    }
  }

  /**
   * Preprocess transcript data for prediction models
   */
  public preprocessData(
    data: TranscriptData[],
    predictionType: 'daily' | 'weekly' | 'monthly',
    clientName?: string
  ): { dates: Date[]; values: number[]; processedData: number[][] } {
    // Filter by client if specified
    let filteredData = clientName 
      ? data.filter(d => d.clientName === clientName)
      : data;

    // Sort by date
    filteredData = filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Aggregate data based on prediction type
    const aggregatedData = this.aggregateByPeriod(filteredData, predictionType);
    
    // Extract dates and values
    const dates = aggregatedData.map(d => d.date);
    const values = aggregatedData.map(d => d.transcriptCount);

    // Create sequences for time series prediction
    const processedData = this.createSequences(values, 7); // Use 7 time steps

    return { dates, values, processedData };
  }

  /**
   * Aggregate data by time period
   */
  private aggregateByPeriod(
    data: TranscriptData[],
    period: 'daily' | 'weekly' | 'monthly'
  ): TranscriptData[] {
    if (period === 'daily') {
      return data;
    }

    const aggregated = new Map<string, { date: Date; transcriptCount: number; clientName: string }>();

    data.forEach(item => {
      const date = new Date(item.date);
      let key: string;

      if (period === 'weekly') {
        // Get start of week (Monday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1);
        key = `${item.clientName}-${startOfWeek.toISOString().split('T')[0]}`;
      } else { // monthly
        key = `${item.clientName}-${date.getFullYear()}-${date.getMonth()}`;
      }

      if (aggregated.has(key)) {
        aggregated.get(key)!.transcriptCount += item.transcriptCount;
      } else {
        aggregated.set(key, {
          date: period === 'weekly' 
            ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1)
            : new Date(date.getFullYear(), date.getMonth(), 1),
          transcriptCount: item.transcriptCount,
          clientName: item.clientName
        });
      }
    });

    return Array.from(aggregated.values()).map(item => ({
      id: '',
      ...item,
      transcriptType: '',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ''
    }));
  }

  /**
   * Create sequences for time series prediction
   */
  private createSequences(data: number[], sequenceLength: number): number[][] {
    const sequences: number[][] = [];
    
    for (let i = 0; i <= data.length - sequenceLength; i++) {
      sequences.push(data.slice(i, i + sequenceLength));
    }
    
    return sequences;
  }

  /**
   * Generate predictions using specified model
   */
  public async generatePredictions(
    data: TranscriptData[],
    options: PredictionOptions
  ): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initializeTensorFlow();
    }

    const { dates, values, processedData } = this.preprocessData(
      data,
      options.predictionType,
      options.clientName
    );

    let predictions: TimePrediction[];
    let modelMetrics: ModelMetrics;

    switch (options.modelType) {
      case 'linear':
        ({ predictions, metrics: modelMetrics } = await this.linearRegression(
          values,
          dates,
          options
        ));
        break;
      case 'polynomial':
        ({ predictions, metrics: modelMetrics } = await this.polynomialRegression(
          values,
          dates,
          options
        ));
        break;
      case 'arima':
        ({ predictions, metrics: modelMetrics } = await this.arimaModel(
          values,
          dates,
          options
        ));
        break;
      default:
        throw new Error(`Unsupported model type: ${options.modelType}`);
    }

    return {
      id: `pred_${Date.now()}`,
      clientName: options.clientName || 'All Clients',
      predictionType: options.predictionType,
      predictions,
      confidence: options.confidenceLevel,
      accuracy: modelMetrics.accuracy,
      modelType: options.modelType,
      createdAt: new Date()
    };
  }

  /**
   * Linear regression model
   */
  private async linearRegression(
    values: number[],
    dates: Date[],
    options: PredictionOptions
  ): Promise<{ predictions: TimePrediction[]; metrics: ModelMetrics }> {
    // Normalize data
    const { normalizedValues, mean, std } = this.normalizeData(values);
    
    // Create training data
    const xs = tf.tensor2d(normalizedValues.map((_, i) => [i]));
    const ys = tf.tensor1d(normalizedValues);

    // Create and compile model
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [1], units: 1 })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Train model
    await model.fit(xs, ys, {
      epochs: 100,
      verbose: 0
    });

    // Generate predictions
    const lastIndex = values.length - 1;
    const predictions: TimePrediction[] = [];
    
    for (let i = 1; i <= options.periodsAhead; i++) {
      const predictionInput = tf.tensor2d([[lastIndex + i]]);
      const prediction = model.predict(predictionInput) as tf.Tensor;
      const normalizedPred = await prediction.data();
      
      // Denormalize prediction
      const denormalizedPred = normalizedPred[0] * std + mean;
      
      // Calculate confidence interval (simplified)
      const confidenceRange = std * 1.96; // 95% confidence interval
      
      const futureDate = this.addPeriods(
        dates[dates.length - 1],
        i,
        options.predictionType
      );

      predictions.push({
        date: futureDate,
        predictedCount: Math.max(0, Math.round(denormalizedPred)),
        confidenceInterval: {
          lower: Math.max(0, Math.round(denormalizedPred - confidenceRange)),
          upper: Math.round(denormalizedPred + confidenceRange)
        }
      });

      predictionInput.dispose();
      prediction.dispose();
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(model, xs, ys, values);

    // Cleanup
    xs.dispose();
    ys.dispose();
    model.dispose();

    return { predictions, metrics };
  }

  /**
   * Polynomial regression model
   */
  private async polynomialRegression(
    values: number[],
    dates: Date[],
    options: PredictionOptions
  ): Promise<{ predictions: TimePrediction[]; metrics: ModelMetrics }> {
    const degree = 3; // Cubic polynomial
    
    // Normalize data
    const { normalizedValues, mean, std } = this.normalizeData(values);
    
    // Create polynomial features
    const polyFeatures = normalizedValues.map((_, i) => {
      const features = [];
      for (let d = 1; d <= degree; d++) {
        features.push(Math.pow(i, d));
      }
      return features;
    });

    const xs = tf.tensor2d(polyFeatures);
    const ys = tf.tensor1d(normalizedValues);

    // Create and compile model
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [degree], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Train model
    await model.fit(xs, ys, {
      epochs: 150,
      verbose: 0
    });

    // Generate predictions
    const lastIndex = values.length - 1;
    const predictions: TimePrediction[] = [];
    
    for (let i = 1; i <= options.periodsAhead; i++) {
      const futureIndex = lastIndex + i;
      const polyInput = [];
      for (let d = 1; d <= degree; d++) {
        polyInput.push(Math.pow(futureIndex, d));
      }
      
      const predictionInput = tf.tensor2d([polyInput]);
      const prediction = model.predict(predictionInput) as tf.Tensor;
      const normalizedPred = await prediction.data();
      
      // Denormalize prediction
      const denormalizedPred = normalizedPred[0] * std + mean;
      
      // Calculate confidence interval
      const confidenceRange = std * 1.96;
      
      const futureDate = this.addPeriods(
        dates[dates.length - 1],
        i,
        options.predictionType
      );

      predictions.push({
        date: futureDate,
        predictedCount: Math.max(0, Math.round(denormalizedPred)),
        confidenceInterval: {
          lower: Math.max(0, Math.round(denormalizedPred - confidenceRange)),
          upper: Math.round(denormalizedPred + confidenceRange)
        }
      });

      predictionInput.dispose();
      prediction.dispose();
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(model, xs, ys, values);

    // Cleanup
    xs.dispose();
    ys.dispose();
    model.dispose();

    return { predictions, metrics };
  }

  /**
   * ARIMA-like model (simplified implementation)
   */
  private async arimaModel(
    values: number[],
    dates: Date[],
    options: PredictionOptions
  ): Promise<{ predictions: TimePrediction[]; metrics: ModelMetrics }> {
    // Simplified ARIMA implementation using LSTM
    const sequenceLength = Math.min(7, values.length - 1);
    
    if (values.length < sequenceLength + 1) {
      throw new Error('Insufficient data for ARIMA model');
    }

    // Normalize data
    const { normalizedValues, mean, std } = this.normalizeData(values);
    
    // Create sequences
    const sequences = this.createSequences(normalizedValues, sequenceLength);
    const xs = tf.tensor3d(sequences.slice(0, -1).map(seq => seq.map(val => [val])));
    const ys = tf.tensor1d(sequences.slice(1).map(seq => seq[seq.length - 1]));

    // Create LSTM model
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({ 
          units: 50, 
          returnSequences: true, 
          inputShape: [sequenceLength, 1] 
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({ units: 50, returnSequences: false }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Train model
    await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      verbose: 0
    });

    // Generate predictions
    const predictions: TimePrediction[] = [];
    let lastSequence = normalizedValues.slice(-sequenceLength);
    
    for (let i = 1; i <= options.periodsAhead; i++) {
      const input = tf.tensor3d([lastSequence.map(val => [val])]);
      const prediction = model.predict(input) as tf.Tensor;
      const normalizedPred = await prediction.data();
      
      // Denormalize prediction
      const denormalizedPred = normalizedPred[0] * std + mean;
      
      // Update sequence for next prediction
      lastSequence = [...lastSequence.slice(1), normalizedPred[0]];
      
      // Calculate confidence interval
      const confidenceRange = std * 1.96;
      
      const futureDate = this.addPeriods(
        dates[dates.length - 1],
        i,
        options.predictionType
      );

      predictions.push({
        date: futureDate,
        predictedCount: Math.max(0, Math.round(denormalizedPred)),
        confidenceInterval: {
          lower: Math.max(0, Math.round(denormalizedPred - confidenceRange)),
          upper: Math.round(denormalizedPred + confidenceRange)
        }
      });

      input.dispose();
      prediction.dispose();
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(model, xs, ys, values);

    // Cleanup
    xs.dispose();
    ys.dispose();
    model.dispose();

    return { predictions, metrics };
  }

  /**
   * Normalize data for better model performance
   */
  private normalizeData(values: number[]): { 
    normalizedValues: number[]; 
    mean: number; 
    std: number; 
  } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1; // Avoid division by zero
    
    const normalizedValues = values.map(val => (val - mean) / std);
    
    return { normalizedValues, mean, std };
  }

  /**
   * Add periods to a date based on prediction type
   */
  private addPeriods(
    date: Date,
    periods: number,
    predictionType: 'daily' | 'weekly' | 'monthly'
  ): Date {
    const newDate = new Date(date);
    
    switch (predictionType) {
      case 'daily':
        newDate.setDate(newDate.getDate() + periods);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + (periods * 7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + periods);
        break;
    }
    
    return newDate;
  }

  /**
   * Calculate model performance metrics
   */
  private async calculateMetrics(
    model: tf.LayersModel,
    xs: tf.Tensor,
    ys: tf.Tensor,
    originalValues: number[]
  ): Promise<ModelMetrics> {
    const predictions = model.predict(xs) as tf.Tensor;
    const predData = await predictions.data();
    const actualData = await ys.data();
    
    // Calculate MSE
    const mse = predData.reduce((sum, pred, i) => {
      return sum + Math.pow(pred - actualData[i], 2);
    }, 0) / predData.length;
    
    // Calculate MAE
    const mae = predData.reduce((sum, pred, i) => {
      return sum + Math.abs(pred - actualData[i]);
    }, 0) / predData.length;
    
    // Calculate RMSE
    const rmse = Math.sqrt(mse);
    
    // Calculate R²
    const actualMean = actualData.reduce((sum, val) => sum + val, 0) / actualData.length;
    const totalSumSquares = actualData.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = predData.reduce((sum, pred, i) => {
      return sum + Math.pow(actualData[i] - pred, 2);
    }, 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);
    
    // Calculate accuracy (percentage of predictions within 10% of actual)
    const accurateCount = predData.reduce((count, pred, i) => {
      const percentError = Math.abs((pred - actualData[i]) / actualData[i]) * 100;
      return percentError <= 10 ? count + 1 : count;
    }, 0);
    const accuracy = (accurateCount / predData.length) * 100;
    
    predictions.dispose();
    
    return { mse, mae, rmse, r2, accuracy };
  }

  /**
   * Validate predictions against known data
   */
  public async validatePredictions(
    trainingData: TranscriptData[],
    testData: TranscriptData[],
    options: PredictionOptions
  ): Promise<ModelMetrics> {
    const predictions = await this.generatePredictions(trainingData, {
      ...options,
      periodsAhead: testData.length
    });

    const actualValues = testData.map(d => d.transcriptCount);
    const predictedValues = predictions.predictions.map(p => p.predictedCount);

    // Calculate validation metrics
    const mse = actualValues.reduce((sum, actual, i) => {
      return sum + Math.pow(actual - predictedValues[i], 2);
    }, 0) / actualValues.length;

    const mae = actualValues.reduce((sum, actual, i) => {
      return sum + Math.abs(actual - predictedValues[i]);
    }, 0) / actualValues.length;

    const rmse = Math.sqrt(mse);

    const actualMean = actualValues.reduce((sum, val) => sum + val, 0) / actualValues.length;
    const totalSumSquares = actualValues.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actualValues.reduce((sum, actual, i) => {
      return sum + Math.pow(actual - predictedValues[i], 2);
    }, 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);

    const accurateCount = actualValues.reduce((count, actual, i) => {
      const percentError = Math.abs((actual - predictedValues[i]) / actual) * 100;
      return percentError <= 10 ? count + 1 : count;
    }, 0);
    const accuracy = (accurateCount / actualValues.length) * 100;

    return { mse, mae, rmse, r2, accuracy };
  }

  /**
   * Get memory usage information
   */
  public getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.models.forEach(model => model.dispose());
    this.models.clear();
  }
}

// Export singleton instance
export const predictionEngine = new PredictionEngine();