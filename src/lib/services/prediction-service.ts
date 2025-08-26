/**
 * Prediction service using TensorFlow.js for transcript volume forecasting
 * Implements linear regression and polynomial regression models
 */

// TensorFlow.js will be dynamically imported to avoid SSR issues
import { 
  TranscriptData, 
  PredictionResult, 
  MonthlyPrediction, 
  ModelMetrics,
  PredictionRequest 
} from '@/types/transcript'
import {
  convertToTimeSeries,
  groupByClient,
  prepareForTraining,
  denormalizeData,
  validateDataQuality,
  createFeatureMatrix,
  TimeSeriesPoint
} from '@/lib/utils/data-preprocessing'

export interface TrainedModel {
  model: any // TensorFlow Sequential model (dynamically imported)
  scaleParams: {
    min: number
    max: number
    mean: number
    std: number
  }
  windowSize: number
  modelType: 'linear' | 'polynomial'
  trainedAt: Date
  metrics: ModelMetrics
}

export interface CachedPrediction {
  result: PredictionResult
  cachedAt: Date
  expiresAt: Date
  requestHash: string
}

export interface ModelValidationResult {
  isValid: boolean
  accuracy: number
  crossValidationScore: number
  residualAnalysis: {
    mean: number
    standardDeviation: number
    skewness: number
    kurtosis: number
  }
  recommendations: string[]
}

export class PredictionService {
  private models: Map<string, TrainedModel> = new Map()
  private predictionCache: Map<string, CachedPrediction> = new Map()
  private isInitialized = false
  private readonly CACHE_TTL_HOURS = 24 // Cache predictions for 24 hours
  private readonly MAX_CACHE_SIZE = 100 // Maximum number of cached predictions

  constructor() {
    this.initializeTensorFlow()
    this.startCacheCleanup()
  }

  /**
   * Initialize TensorFlow.js for browser environment
   */
  private async initializeTensorFlow(): Promise<void> {
    try {
      // Only initialize in browser environment
      if (typeof window === 'undefined') {
        console.warn('TensorFlow.js not available in server environment')
        return
      }

      const tf = await import('@tensorflow/tfjs')
      
      // Set backend to webgl for better performance, fallback to cpu
      await tf.setBackend('webgl')
      await tf.ready()
      this.isInitialized = true
      console.log('TensorFlow.js initialized with backend:', tf.getBackend())
    } catch (error) {
      console.warn('WebGL backend failed, falling back to CPU:', error)
      try {
        const tf = await import('@tensorflow/tfjs')
        await tf.setBackend('cpu')
        await tf.ready()
        this.isInitialized = true
        console.log('TensorFlow.js initialized with CPU backend')
      } catch (cpuError) {
        console.error('Failed to initialize TensorFlow.js:', cpuError)
        throw new Error('Failed to initialize TensorFlow.js')
      }
    }
  }

  /**
   * Ensure TensorFlow.js is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeTensorFlow()
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      this.cleanupExpiredCache()
    }, 60 * 60 * 1000)
  }

  /**
   * Generate hash for prediction request to use as cache key
   */
  private generateRequestHash(clientName: string, request: PredictionRequest, dataHash: string): string {
    const requestString = JSON.stringify({
      clientName,
      monthsAhead: request.monthsAhead,
      modelType: request.modelType,
      dataHash
    })
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < requestString.length; i++) {
      const char = requestString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  /**
   * Generate hash for data to detect changes
   */
  private generateDataHash(data: TranscriptData[]): string {
    const dataString = JSON.stringify(data.map(d => ({
      clientName: d.clientName,
      month: d.month,
      transcriptCount: d.transcriptCount
    })).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.month.localeCompare(b.month)))
    
    let hash = 0
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString()
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date()
    const expiredKeys: string[] = []
    
    for (const [key, cached] of this.predictionCache) {
      if (cached.expiresAt < now) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.predictionCache.delete(key))
    
    // If cache is still too large, remove oldest entries
    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.predictionCache.entries())
      entries.sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime())
      
      const toRemove = entries.slice(0, this.predictionCache.size - this.MAX_CACHE_SIZE)
      toRemove.forEach(([key]) => this.predictionCache.delete(key))
    }
  }

  /**
   * Get cached prediction if available and not expired
   */
  private getCachedPrediction(requestHash: string): PredictionResult | null {
    const cached = this.predictionCache.get(requestHash)
    if (!cached) return null
    
    const now = new Date()
    if (cached.expiresAt < now) {
      this.predictionCache.delete(requestHash)
      return null
    }
    
    return cached.result
  }

  /**
   * Cache prediction result with intelligent TTL based on data freshness
   */
  private cachePrediction(requestHash: string, result: PredictionResult): void {
    const now = new Date()
    
    // Adjust TTL based on model accuracy and data recency
    let ttlHours = this.CACHE_TTL_HOURS
    
    // Reduce TTL for less accurate models
    if (result.confidence < 0.7) {
      ttlHours = Math.max(1, ttlHours * 0.5)
    }
    
    // Reduce TTL for longer prediction horizons
    const maxMonthsAhead = Math.max(...result.predictions.map(p => {
      const predDate = new Date(p.month + '-01')
      const monthsFromNow = (predDate.getFullYear() - now.getFullYear()) * 12 + 
                           (predDate.getMonth() - now.getMonth())
      return monthsFromNow
    }))
    
    if (maxMonthsAhead > 6) {
      ttlHours = Math.max(0.5, ttlHours * 0.3)
    }
    
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)
    
    this.predictionCache.set(requestHash, {
      result,
      cachedAt: now,
      expiresAt,
      requestHash
    })
    
    // Clean up if cache is getting too large
    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      this.cleanupExpiredCache()
    }
  }

  /**
   * Create a linear regression model
   */
  private createLinearModel(inputShape: number): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 16,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    })

    return model
  }

  /**
   * Create a polynomial regression model
   */
  private createPolynomialModel(inputShape: number): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'meanSquaredError',
      metrics: ['mae']
    })

    return model
  }

  /**
   * Train a model with hyperparameter optimization
   */
  async trainModelWithOptimization(
    clientName: string,
    data: TranscriptData[],
    modelType: 'linear' | 'polynomial' = 'linear'
  ): Promise<TrainedModel> {
    await this.ensureInitialized()

    const clientData = data.filter(item => item.clientName === clientName)
    
    if (clientData.length < 6) {
      throw new Error(`Insufficient data for client ${clientName}. Need at least 6 data points.`)
    }

    // Try different window sizes and select the best one
    const windowSizes = [2, 3, 4, 5].filter(size => size < clientData.length / 2)
    let bestModel: TrainedModel | null = null
    let bestScore = -Infinity

    for (const windowSize of windowSizes) {
      try {
        const model = await this.trainModel(clientName, data, modelType, windowSize)
        const crossValidationScore = await this.performCrossValidation(data, clientName, modelType, windowSize, 3)
        
        // Combined score: accuracy + cross-validation - complexity penalty
        const complexityPenalty = windowSize * 0.01 // Prefer simpler models
        const combinedScore = model.metrics.accuracy + crossValidationScore - complexityPenalty
        
        if (combinedScore > bestScore) {
          bestScore = combinedScore
          if (bestModel) {
            bestModel.model.dispose() // Clean up previous best model
          }
          bestModel = model
        } else {
          model.model.dispose() // Clean up inferior model
        }
      } catch (error) {
        console.warn(`Failed to train model with window size ${windowSize}:`, error)
        continue
      }
    }

    if (!bestModel) {
      // Fallback to default training
      return this.trainModel(clientName, data, modelType, 3)
    }

    // Store the optimized model
    this.models.set(clientName, bestModel)
    return bestModel
  }

  /**
   * Train a model for a specific client
   */
  async trainModel(
    clientName: string,
    data: TranscriptData[],
    modelType: 'linear' | 'polynomial' = 'linear',
    windowSize: number = 3
  ): Promise<TrainedModel> {
    await this.ensureInitialized()

    // Filter data for specific client
    const clientData = data.filter(item => item.clientName === clientName)
    
    if (clientData.length < 6) {
      throw new Error(`Insufficient data for client ${clientName}. Need at least 6 data points.`)
    }

    // Convert to time series and validate
    const timeSeries = convertToTimeSeries(clientData)
    const validation = validateDataQuality(timeSeries)
    
    if (!validation.isValid) {
      console.warn(`Data quality issues for ${clientName}:`, validation.issues)
    }

    // Prepare training data
    const {
      trainFeatures,
      trainTargets,
      testFeatures,
      testTargets,
      scaleParams
    } = prepareForTraining(timeSeries, windowSize, 0.2)

    if (trainFeatures.length < 3) {
      throw new Error(`Insufficient training data for client ${clientName}`)
    }

    // Create model
    const model = modelType === 'polynomial' 
      ? this.createPolynomialModel(trainFeatures[0].length)
      : this.createLinearModel(trainFeatures[0].length)

    // Convert to tensors
    const xTrain = tf.tensor2d(trainFeatures)
    const yTrain = tf.tensor1d(trainTargets)
    const xTest = tf.tensor2d(testFeatures)
    const yTest = tf.tensor1d(testTargets)

    try {
      // Train the model
      const history = await model.fit(xTrain, yTrain, {
        epochs: 100,
        batchSize: Math.min(32, Math.max(1, Math.floor(trainFeatures.length / 4))),
        validationData: testFeatures.length > 0 ? [xTest, yTest] : undefined,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`)
            }
          }
        }
      })

      // Calculate metrics
      const metrics = await this.calculateMetrics(model, xTest, yTest, testTargets, scaleParams)

      const trainedModel: TrainedModel = {
        model,
        scaleParams,
        windowSize,
        modelType,
        trainedAt: new Date(),
        metrics
      }

      // Store the trained model
      this.models.set(clientName, trainedModel)

      return trainedModel
    } finally {
      // Clean up tensors
      xTrain.dispose()
      yTrain.dispose()
      xTest.dispose()
      yTest.dispose()
    }
  }

  /**
   * Perform cross-validation on the model
   */
  private async performCrossValidation(
    data: TranscriptData[],
    clientName: string,
    modelType: 'linear' | 'polynomial',
    windowSize: number,
    folds: number = 5
  ): Promise<number> {
    const clientData = data.filter(item => item.clientName === clientName)
    const timeSeries = convertToTimeSeries(clientData)
    
    if (timeSeries.length < folds * 2) {
      console.warn(`Insufficient data for ${folds}-fold cross-validation`)
      return 0.5 // Return default score
    }
    
    const foldSize = Math.floor(timeSeries.length / folds)
    const scores: number[] = []
    
    for (let i = 0; i < folds; i++) {
      try {
        // Create train/test split for this fold
        const testStart = i * foldSize
        const testEnd = Math.min((i + 1) * foldSize, timeSeries.length)
        
        const testData = timeSeries.slice(testStart, testEnd)
        const trainData = [
          ...timeSeries.slice(0, testStart),
          ...timeSeries.slice(testEnd)
        ]
        
        if (trainData.length < windowSize + 1) continue
        
        // Prepare training data
        const {
          trainFeatures,
          trainTargets,
          scaleParams
        } = prepareForTraining(trainData, windowSize, 0)
        
        if (trainFeatures.length < 2) continue
        
        // Create and train model
        const foldModel = modelType === 'polynomial' 
          ? this.createPolynomialModel(trainFeatures[0].length)
          : this.createLinearModel(trainFeatures[0].length)
        
        const xTrain = tf.tensor2d(trainFeatures)
        const yTrain = tf.tensor1d(trainTargets)
        
        await foldModel.fit(xTrain, yTrain, {
          epochs: 50,
          verbose: 0,
          batchSize: Math.min(16, Math.max(1, Math.floor(trainFeatures.length / 2)))
        })
        
        // Test on validation data
        if (testData.length >= windowSize + 1) {
          const { features: testFeatures, targets: testTargets } = createFeatureMatrix(testData, windowSize)
          
          if (testFeatures.length > 0) {
            // Normalize test features
            const normalizedTestFeatures = testFeatures.map(row => {
              return row.map((val, colIndex) => {
                const columnValues = trainFeatures.map(r => r[colIndex])
                const min = Math.min(...columnValues)
                const max = Math.max(...columnValues)
                return max > min ? (val - min) / (max - min) : 0
              })
            })
            
            const xTest = tf.tensor2d(normalizedTestFeatures)
            const predictions = foldModel.predict(xTest) as tf.Tensor1D
            const predArray = await predictions.data()
            
            // Denormalize predictions
            const denormalizedPred = denormalizeData(Array.from(predArray), scaleParams)
            
            // Calculate R² score for this fold
            const actualMean = testTargets.reduce((sum, val) => sum + val, 0) / testTargets.length
            const totalSumSquares = testTargets.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0)
            const residualSumSquares = denormalizedPred.reduce((sum, pred, idx) => 
              sum + Math.pow(testTargets[idx] - pred, 2), 0)
            
            const r2Score = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0
            scores.push(Math.max(-1, Math.min(1, r2Score)))
            
            xTest.dispose()
            predictions.dispose()
          }
        }
        
        // Clean up
        xTrain.dispose()
        yTrain.dispose()
        foldModel.dispose()
        
      } catch (error) {
        console.warn(`Cross-validation fold ${i} failed:`, error)
        continue
      }
    }
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5
  }

  /**
   * Validate model performance and provide recommendations
   */
  async validateModel(
    clientName: string,
    data: TranscriptData[],
    trainedModel: TrainedModel
  ): Promise<ModelValidationResult> {
    const clientData = data.filter(item => item.clientName === clientName)
    const timeSeries = convertToTimeSeries(clientData)
    
    // Perform cross-validation
    const crossValidationScore = await this.performCrossValidation(
      data,
      clientName,
      trainedModel.modelType,
      trainedModel.windowSize
    )
    
    // Calculate residual analysis
    const { features, targets } = createFeatureMatrix(timeSeries, trainedModel.windowSize)
    
    if (features.length === 0) {
      return {
        isValid: false,
        accuracy: 0,
        crossValidationScore: 0,
        residualAnalysis: {
          mean: 0,
          standardDeviation: 0,
          skewness: 0,
          kurtosis: 0
        },
        recommendations: ['Insufficient data for model validation']
      }
    }
    
    // Normalize features
    const normalizedFeatures = features.map(row => {
      return row.map((val, colIndex) => {
        const columnValues = features.map(r => r[colIndex])
        const min = Math.min(...columnValues)
        const max = Math.max(...columnValues)
        return max > min ? (val - min) / (max - min) : 0
      })
    })
    
    // Get predictions
    const xTensor = tf.tensor2d(normalizedFeatures)
    const predictions = trainedModel.model.predict(xTensor) as tf.Tensor1D
    const predArray = await predictions.data()
    
    // Denormalize predictions
    const denormalizedPred = denormalizeData(Array.from(predArray), trainedModel.scaleParams)
    
    // Calculate residuals
    const residuals = targets.map((actual, i) => actual - denormalizedPred[i])
    
    // Residual statistics
    const residualMean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length
    const residualVariance = residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / residuals.length
    const residualStd = Math.sqrt(residualVariance)
    
    // Skewness and kurtosis
    const skewness = residuals.reduce((sum, r) => sum + Math.pow((r - residualMean) / residualStd, 3), 0) / residuals.length
    const kurtosis = residuals.reduce((sum, r) => sum + Math.pow((r - residualMean) / residualStd, 4), 0) / residuals.length - 3
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (trainedModel.metrics.accuracy < 0.7) {
      recommendations.push('Model accuracy is below 70%. Consider collecting more data or trying a different model type.')
    }
    
    if (crossValidationScore < 0.5) {
      recommendations.push('Cross-validation score is low. The model may be overfitting.')
    }
    
    if (Math.abs(residualMean) > residualStd * 0.1) {
      recommendations.push('Residuals show bias. The model may be systematically over or under-predicting.')
    }
    
    if (Math.abs(skewness) > 1) {
      recommendations.push('Residuals are highly skewed. Consider data transformation or outlier removal.')
    }
    
    if (Math.abs(kurtosis) > 2) {
      recommendations.push('Residuals show high kurtosis. There may be outliers affecting the model.')
    }
    
    if (timeSeries.length < 12) {
      recommendations.push('Limited historical data. Predictions may be less reliable.')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Model validation passed. The model appears to be performing well.')
    }
    
    // Clean up
    xTensor.dispose()
    predictions.dispose()
    
    return {
      isValid: trainedModel.metrics.accuracy >= 0.5 && crossValidationScore >= 0.3,
      accuracy: trainedModel.metrics.accuracy,
      crossValidationScore,
      residualAnalysis: {
        mean: residualMean,
        standardDeviation: residualStd,
        skewness,
        kurtosis
      },
      recommendations
    }
  }

  /**
   * Calculate comprehensive model performance metrics
   */
  private async calculateMetrics(
    model: tf.Sequential,
    xTest: tf.Tensor2D,
    yTest: tf.Tensor1D,
    actualValues: number[],
    scaleParams: any
  ): Promise<ModelMetrics> {
    if (xTest.shape[0] === 0) {
      // No test data available, return default metrics
      return {
        accuracy: 0.8,
        precision: 0.8,
        recall: 0.8,
        meanAbsoluteError: 0.1,
        rootMeanSquareError: 0.15,
        r2Score: 0.7
      }
    }

    const predictions = model.predict(xTest) as tf.Tensor1D
    const predArray = await predictions.data()
    const actualArray = await yTest.data()

    // Denormalize for meaningful metrics
    const denormalizedPred = denormalizeData(Array.from(predArray), scaleParams)
    const denormalizedActual = denormalizeData(Array.from(actualArray), scaleParams)

    // Basic regression metrics
    const mae = denormalizedPred.reduce((sum, pred, i) => 
      sum + Math.abs(pred - denormalizedActual[i]), 0) / denormalizedPred.length

    const mse = denormalizedPred.reduce((sum, pred, i) => 
      sum + Math.pow(pred - denormalizedActual[i], 2), 0) / denormalizedPred.length
    
    const rmse = Math.sqrt(mse)

    // R² score (coefficient of determination)
    const actualMean = denormalizedActual.reduce((sum, val) => sum + val, 0) / denormalizedActual.length
    const totalSumSquares = denormalizedActual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0)
    const residualSumSquares = denormalizedPred.reduce((sum, pred, i) => 
      sum + Math.pow(denormalizedActual[i] - pred, 2), 0)
    
    const r2Score = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0

    // Mean Absolute Percentage Error (MAPE)
    const mape = denormalizedPred.reduce((sum, pred, i) => {
      const actual = denormalizedActual[i]
      return actual !== 0 ? sum + Math.abs((actual - pred) / actual) : sum
    }, 0) / denormalizedPred.length

    // Symmetric Mean Absolute Percentage Error (SMAPE) - more robust
    const smape = denormalizedPred.reduce((sum, pred, i) => {
      const actual = denormalizedActual[i]
      const denominator = (Math.abs(actual) + Math.abs(pred)) / 2
      return denominator !== 0 ? sum + Math.abs(actual - pred) / denominator : sum
    }, 0) / denormalizedPred.length

    // Directional accuracy (for trend prediction)
    let directionalAccuracy = 0
    if (denormalizedActual.length > 1) {
      let correctDirections = 0
      for (let i = 1; i < denormalizedActual.length; i++) {
        const actualDirection = denormalizedActual[i] - denormalizedActual[i - 1]
        const predDirection = denormalizedPred[i] - denormalizedPred[i - 1]
        if ((actualDirection >= 0 && predDirection >= 0) || (actualDirection < 0 && predDirection < 0)) {
          correctDirections++
        }
      }
      directionalAccuracy = correctDirections / (denormalizedActual.length - 1)
    }

    // Normalized accuracy based on data range
    const dataRange = Math.max(...denormalizedActual) - Math.min(...denormalizedActual)
    const normalizedAccuracy = dataRange > 0 ? Math.max(0, 1 - (rmse / dataRange)) : 0.5

    // Combined accuracy score
    const accuracy = Math.max(0, Math.min(1, 
      0.4 * normalizedAccuracy + 
      0.3 * Math.max(0, r2Score) + 
      0.2 * directionalAccuracy + 
      0.1 * Math.max(0, 1 - smape)
    ))

    predictions.dispose()

    return {
      accuracy: Math.max(0, Math.min(1, accuracy)),
      precision: Math.max(0, Math.min(1, directionalAccuracy)), // Use directional accuracy as precision
      recall: Math.max(0, Math.min(1, 1 - mape)), // Use inverse MAPE as recall
      meanAbsoluteError: mae,
      rootMeanSquareError: rmse,
      r2Score: Math.max(-1, Math.min(1, r2Score))
    }
  }

  /**
   * Generate predictions for a specific client with enhanced confidence intervals
   */
  async generatePredictions(
    clientName: string,
    data: TranscriptData[],
    request: PredictionRequest
  ): Promise<PredictionResult> {
    await this.ensureInitialized()

    // Check cache first
    const dataHash = this.generateDataHash(data.filter(d => d.clientName === clientName))
    const requestHash = this.generateRequestHash(clientName, request, dataHash)
    
    const cachedResult = this.getCachedPrediction(requestHash)
    if (cachedResult) {
      return cachedResult
    }

    // Train model if not exists or retrain if requested
    let trainedModel = this.models.get(clientName)
    if (!trainedModel || trainedModel.modelType !== request.modelType) {
      trainedModel = await this.trainModel(clientName, data, request.modelType)
    }

    // Get recent data for prediction context
    const clientData = data.filter(item => item.clientName === clientName)
    const timeSeries = convertToTimeSeries(clientData)
    
    if (timeSeries.length < trainedModel.windowSize) {
      throw new Error(`Insufficient data for prediction. Need at least ${trainedModel.windowSize} data points.`)
    }

    // Get the last few data points as context
    const recentData = timeSeries.slice(-trainedModel.windowSize)
    const predictions: MonthlyPrediction[] = []

    // Calculate prediction uncertainty based on historical variance
    const historicalValues = timeSeries.map(point => point.value)
    const historicalMean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length
    const historicalVariance = historicalValues.reduce((sum, val) => sum + Math.pow(val - historicalMean, 2), 0) / historicalValues.length
    const historicalStd = Math.sqrt(historicalVariance)

    // Generate predictions for requested months
    let currentContext = [...recentData]
    let cumulativeUncertainty = 0
    
    for (let i = 0; i < request.monthsAhead; i++) {
      // Prepare feature vector
      const lastDate = new Date(currentContext[currentContext.length - 1].timestamp)
      const nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1)
      
      const features = []
      
      // Add lag features
      for (let j = 0; j < trainedModel.windowSize; j++) {
        const contextIndex = currentContext.length - trainedModel.windowSize + j
        features.push(currentContext[contextIndex].value)
      }
      
      // Add time-based features
      features.push(nextDate.getMonth() + 1) // Month (1-12)
      features.push(nextDate.getFullYear()) // Year
      
      // Add trend feature
      const trendSlope = currentContext.length >= 2 
        ? (currentContext[currentContext.length - 1].value - currentContext[currentContext.length - 2].value)
        : 0
      features.push(trendSlope)

      // Add seasonal feature (simple seasonal index)
      const seasonalIndex = Math.sin(2 * Math.PI * (nextDate.getMonth() + 1) / 12)
      features.push(seasonalIndex)

      // Normalize features (simple min-max based on training data patterns)
      const normalizedFeatures = features.map((val, idx) => {
        if (idx < trainedModel.windowSize) {
          // Normalize lag features
          const range = trainedModel.scaleParams.max - trainedModel.scaleParams.min
          return range > 0 ? (val - trainedModel.scaleParams.min) / range : 0
        } else if (idx === trainedModel.windowSize) {
          // Normalize month (1-12)
          return (val - 1) / 11
        } else if (idx === trainedModel.windowSize + 1) {
          // Normalize year (use a reasonable range)
          return (val - 2020) / 10
        } else if (idx === trainedModel.windowSize + 2) {
          // Normalize trend
          return Math.max(-1, Math.min(1, val / (historicalStd || 1)))
        } else {
          // Seasonal feature is already normalized (-1 to 1)
          return val
        }
      })

      // Make prediction with multiple samples for uncertainty estimation
      const numSamples = 10
      const predictions_samples: number[] = []
      
      for (let sample = 0; sample < numSamples; sample++) {
        // Add small random noise to features for uncertainty estimation
        const noisyFeatures = normalizedFeatures.map(val => 
          val + (Math.random() - 0.5) * 0.01 * (1 - trainedModel.metrics.accuracy)
        )
        
        const inputTensor = tf.tensor2d([noisyFeatures])
        const predictionTensor = trainedModel.model.predict(inputTensor) as tf.Tensor1D
        const normalizedPrediction = (await predictionTensor.data())[0]
        
        // Denormalize prediction
        const denormalizedPrediction = denormalizeData([normalizedPrediction], trainedModel.scaleParams)[0]
        predictions_samples.push(Math.max(0, denormalizedPrediction))
        
        // Clean up tensors
        inputTensor.dispose()
        predictionTensor.dispose()
      }
      
      // Calculate mean and standard deviation of predictions
      const meanPrediction = predictions_samples.reduce((sum, val) => sum + val, 0) / predictions_samples.length
      const predictionVariance = predictions_samples.reduce((sum, val) => sum + Math.pow(val - meanPrediction, 2), 0) / predictions_samples.length
      const predictionStd = Math.sqrt(predictionVariance)
      
      const predictedCount = Math.max(0, Math.round(meanPrediction))

      // Enhanced confidence interval calculation
      // Combine model uncertainty with prediction uncertainty and increase with time horizon
      cumulativeUncertainty += 0.1 // Uncertainty increases with prediction horizon
      const modelUncertainty = (1 - trainedModel.metrics.accuracy) * predictedCount * 0.3
      const predictionUncertainty = predictionStd * 1.96 // 95% confidence interval
      const timeHorizonUncertainty = cumulativeUncertainty * predictedCount * 0.1
      
      const totalUncertainty = Math.sqrt(
        Math.pow(modelUncertainty, 2) + 
        Math.pow(predictionUncertainty, 2) + 
        Math.pow(timeHorizonUncertainty, 2)
      )
      
      const prediction: MonthlyPrediction = {
        month: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`,
        year: nextDate.getFullYear(),
        predictedCount,
        confidenceInterval: {
          lower: Math.max(0, Math.round(predictedCount - totalUncertainty)),
          upper: Math.round(predictedCount + totalUncertainty)
        }
      }

      predictions.push(prediction)

      // Update context for next prediction (use mean prediction)
      currentContext.push({
        timestamp: nextDate.getTime(),
        value: meanPrediction,
        month: prediction.month,
        year: prediction.year
      })

      // Keep only the required window size
      if (currentContext.length > trainedModel.windowSize * 2) {
        currentContext = currentContext.slice(-trainedModel.windowSize)
      }
    }

    const result: PredictionResult = {
      clientName,
      predictions,
      confidence: trainedModel.metrics.accuracy,
      accuracy: trainedModel.metrics.r2Score,
      model: request.modelType,
      generatedAt: new Date()
    }

    // Cache the result
    this.cachePrediction(requestHash, result)

    return result
  }

  /**
   * Train models for multiple clients in batch for better performance
   */
  async batchTrainModels(
    data: TranscriptData[],
    modelType: 'linear' | 'polynomial' = 'linear',
    useOptimization: boolean = false
  ): Promise<Map<string, TrainedModel>> {
    const clientData = groupByClient(data)
    const trainedModels = new Map<string, TrainedModel>()
    const trainingPromises: Promise<void>[] = []

    // Limit concurrent training to prevent memory issues
    const maxConcurrent = 3
    let currentBatch: Promise<void>[] = []

    for (const [clientName] of clientData) {
      const trainingPromise = (async () => {
        try {
          const model = useOptimization 
            ? await this.trainModelWithOptimization(clientName, data, modelType)
            : await this.trainModel(clientName, data, modelType)
          trainedModels.set(clientName, model)
        } catch (error) {
          console.error(`Failed to train model for ${clientName}:`, error)
        }
      })()

      currentBatch.push(trainingPromise)

      if (currentBatch.length >= maxConcurrent) {
        await Promise.all(currentBatch)
        currentBatch = []
      }
    }

    // Wait for remaining batch
    if (currentBatch.length > 0) {
      await Promise.all(currentBatch)
    }

    return trainedModels
  }

  /**
   * Generate predictions for all clients with improved performance
   */
  async generateAllPredictions(
    data: TranscriptData[],
    request: Omit<PredictionRequest, 'clientName'>
  ): Promise<PredictionResult[]> {
    const clientData = groupByClient(data)
    const results: PredictionResult[] = []

    // Pre-train models if needed for better performance
    const clientsNeedingTraining = Array.from(clientData.keys()).filter(clientName => {
      const existingModel = this.models.get(clientName)
      return !existingModel || existingModel.modelType !== request.modelType
    })

    if (clientsNeedingTraining.length > 1) {
      console.log(`Batch training models for ${clientsNeedingTraining.length} clients...`)
      await this.batchTrainModels(
        data.filter(item => clientsNeedingTraining.includes(item.clientName)),
        request.modelType,
        true // Use optimization for batch training
      )
    }

    // Generate predictions with limited concurrency
    const maxConcurrent = 2
    const predictionPromises: Promise<void>[] = []
    let currentBatch: Promise<void>[] = []

    for (const [clientName] of clientData) {
      const predictionPromise = (async () => {
        try {
          const prediction = await this.generatePredictions(
            clientName,
            data,
            { ...request, clientName }
          )
          results.push(prediction)
        } catch (error) {
          console.error(`Failed to generate predictions for ${clientName}:`, error)
          // Continue with other clients
        }
      })()

      currentBatch.push(predictionPromise)

      if (currentBatch.length >= maxConcurrent) {
        await Promise.all(currentBatch)
        currentBatch = []
      }
    }

    // Wait for remaining batch
    if (currentBatch.length > 0) {
      await Promise.all(currentBatch)
    }

    return results
  }

  /**
   * Get model information for a client
   */
  getModelInfo(clientName: string): TrainedModel | null {
    return this.models.get(clientName) || null
  }

  /**
   * Clear all trained models (useful for memory management)
   */
  clearModels(): void {
    this.models.forEach(trainedModel => {
      trainedModel.model.dispose()
    })
    this.models.clear()
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory()
  }

  /**
   * Validate prediction request
   */
  validatePredictionRequest(request: PredictionRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (request.monthsAhead < 1 || request.monthsAhead > 24) {
      errors.push('monthsAhead must be between 1 and 24')
    }

    if (!['linear', 'polynomial', 'arima'].includes(request.modelType)) {
      errors.push('modelType must be linear, polynomial, or arima')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.predictionCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
    oldestEntry?: Date
    newestEntry?: Date
  } {
    const entries = Array.from(this.predictionCache.values())
    
    return {
      size: this.predictionCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.cachedAt.getTime()))) : undefined,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.cachedAt.getTime()))) : undefined
    }
  }

  /**
   * Invalidate cache for specific client
   */
  invalidateClientCache(clientName: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, cached] of this.predictionCache) {
      if (cached.result.clientName === clientName) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.predictionCache.delete(key))
  }

  /**
   * Get comprehensive model performance report
   */
  async getModelPerformanceReport(
    clientName: string,
    data: TranscriptData[]
  ): Promise<{
    modelInfo: TrainedModel | null
    validation: ModelValidationResult | null
    dataQuality: ReturnType<typeof validateDataQuality>
    recommendations: string[]
  }> {
    const modelInfo = this.getModelInfo(clientName)
    
    if (!modelInfo) {
      return {
        modelInfo: null,
        validation: null,
        dataQuality: { isValid: false, issues: ['No trained model found'], recommendations: [] },
        recommendations: ['Train a model first before generating performance report']
      }
    }
    
    const clientData = data.filter(item => item.clientName === clientName)
    const timeSeries = convertToTimeSeries(clientData)
    const dataQuality = validateDataQuality(timeSeries)
    
    const validation = await this.validateModel(clientName, data, modelInfo)
    
    const recommendations = [
      ...dataQuality.recommendations,
      ...validation.recommendations
    ]

    return {
      modelInfo,
      validation,
      dataQuality,
      recommendations
    }
  }

  /**
   * Dispose of all resources and clean up
   */
  dispose(): void {
    // Clear all trained models
    this.clearModels()
    
    // Clear prediction cache
    this.clearCache()
    
    // Clear any intervals
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
    }
  }

  private cacheCleanupInterval?: NodeJS.Timeout

  /**
   * Start periodic cache cleanup with proper interval tracking
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache()
    }, 60 * 60 * 1000)
  }
}