/**
 * API routes for model comparison and cross-validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { ModelComparisonService } from '@/lib/services/prediction-config/model-comparison-service'
import { ModelComparison } from '@/types/prediction-config'

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const comparisonService = new ModelComparisonService(db)

/**
 * POST /api/prediction-config/model-comparison
 * Run model comparison with cross-validation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const comparison: ModelComparison = await request.json()

    // Validate required fields
    if (!comparison.name) {
      return NextResponse.json(
        { error: 'Comparison name is required' },
        { status: 400 }
      )
    }

    if (!comparison.models || comparison.models.length < 2) {
      return NextResponse.json(
        { error: 'At least two models are required for comparison' },
        { status: 400 }
      )
    }

    if (!comparison.dataset) {
      return NextResponse.json(
        { error: 'Dataset is required' },
        { status: 400 }
      )
    }

    if (!comparison.metrics || comparison.metrics.length === 0) {
      return NextResponse.json(
        { error: 'At least one comparison metric is required' },
        { status: 400 }
      )
    }

    if (!comparison.crossValidationConfig) {
      return NextResponse.json(
        { error: 'Cross-validation configuration is required' },
        { status: 400 }
      )
    }

    // Validate cross-validation config
    const cvConfig = comparison.crossValidationConfig
    if (cvConfig.folds < 2 || cvConfig.folds > 20) {
      return NextResponse.json(
        { error: 'Number of folds must be between 2 and 20' },
        { status: 400 }
      )
    }

    if (cvConfig.method === 'time_series' && cvConfig.gap !== undefined && cvConfig.gap < 0) {
      return NextResponse.json(
        { error: 'Gap for time series CV must be non-negative' },
        { status: 400 }
      )
    }

    const result = await comparisonService.runModelComparison(comparison)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running model comparison:', error)
    return NextResponse.json(
      { error: 'Failed to run model comparison' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prediction-config/model-comparison/templates
 * Get predefined model comparison templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = [
      {
        id: 'forecasting-benchmark',
        name: 'Forecasting Benchmark',
        description: 'Compare common forecasting algorithms',
        models: [
          {
            modelId: 'automl-forecasting',
            modelName: 'Vertex AI AutoML Forecasting',
            algorithm: 'automl',
            parameters: {
              optimizationObjective: 'minimize_rmse',
              budgetMilliNodeHours: 1000
            },
            isBaseline: true
          },
          {
            modelId: 'arima-model',
            modelName: 'ARIMA',
            algorithm: 'arima',
            parameters: {
              order: [1, 1, 1],
              seasonalOrder: [1, 1, 1, 7]
            }
          },
          {
            modelId: 'prophet-model',
            modelName: 'Prophet',
            algorithm: 'prophet',
            parameters: {
              seasonalityMode: 'additive',
              changePointPriorScale: 0.05
            }
          },
          {
            modelId: 'lstm-model',
            modelName: 'LSTM Neural Network',
            algorithm: 'lstm',
            parameters: {
              hiddenUnits: 50,
              sequenceLength: 30,
              epochs: 100
            }
          }
        ],
        metrics: [
          { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
          { name: 'rmse', displayName: 'Root Mean Square Error', higherIsBetter: false },
          { name: 'mape', displayName: 'Mean Absolute Percentage Error', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
        ],
        crossValidationConfig: {
          method: 'time_series',
          folds: 5,
          testSize: 30,
          gap: 0
        }
      },
      {
        id: 'quick-comparison',
        name: 'Quick Model Comparison',
        description: 'Fast comparison with fewer models and metrics',
        models: [
          {
            modelId: 'automl-forecasting',
            modelName: 'Vertex AI AutoML',
            algorithm: 'automl',
            parameters: {},
            isBaseline: true
          },
          {
            modelId: 'simple-linear',
            modelName: 'Linear Regression',
            algorithm: 'linear',
            parameters: {}
          }
        ],
        metrics: [
          { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
        ],
        crossValidationConfig: {
          method: 'k_fold',
          folds: 3
        }
      },
      {
        id: 'comprehensive-evaluation',
        name: 'Comprehensive Model Evaluation',
        description: 'Thorough evaluation with multiple algorithms and metrics',
        models: [
          {
            modelId: 'automl-forecasting',
            modelName: 'Vertex AI AutoML Forecasting',
            algorithm: 'automl',
            parameters: {},
            isBaseline: true
          },
          {
            modelId: 'arima-auto',
            modelName: 'Auto ARIMA',
            algorithm: 'arima',
            parameters: { auto: true }
          },
          {
            modelId: 'prophet-auto',
            modelName: 'Prophet (Auto)',
            algorithm: 'prophet',
            parameters: { seasonalityMode: 'auto' }
          },
          {
            modelId: 'lstm-deep',
            modelName: 'Deep LSTM',
            algorithm: 'lstm',
            parameters: { layers: 2, hiddenUnits: 100 }
          },
          {
            modelId: 'ensemble',
            modelName: 'Ensemble Model',
            algorithm: 'ensemble',
            parameters: { methods: ['arima', 'prophet', 'lstm'] }
          }
        ],
        metrics: [
          { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
          { name: 'rmse', displayName: 'Root Mean Square Error', higherIsBetter: false },
          { name: 'mape', displayName: 'Mean Absolute Percentage Error', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true },
          { name: 'aic', displayName: 'Akaike Information Criterion', higherIsBetter: false },
          { name: 'bic', displayName: 'Bayesian Information Criterion', higherIsBetter: false }
        ],
        crossValidationConfig: {
          method: 'walk_forward',
          folds: 10,
          testSize: 7
        }
      }
    ]

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching model comparison templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model comparison templates' },
      { status: 500 }
    )
  }
}