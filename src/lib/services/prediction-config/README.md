# Prediction Configuration System

This module implements customizable prediction parameters and filtering capabilities for the Advanced Predictive Analytics Platform. It provides comprehensive tools for configuring predictions, running scenario analysis, and comparing model performance.

## Features

### 1. Prediction Configuration Management
- **Customizable Parameters**: Configure confidence levels, forecast horizons, model algorithms, and seasonality modes
- **Advanced Filtering**: Filter predictions by client, date range, transcript type, and business segments
- **Template System**: Save and reuse prediction configurations as templates
- **Validation**: Comprehensive validation with error handling and warnings

### 2. Scenario Modeling & What-If Analysis
- **Multiple Scenarios**: Run multiple scenarios simultaneously with different variable changes
- **Variable Types**: Support for growth rates, seasonal factors, external events, capacity constraints, and market conditions
- **Impact Analysis**: Detailed analysis of scenario impacts with risk assessment
- **Comparison Metrics**: Compare scenarios across multiple dimensions (total volume, peak value, volatility)

### 3. Model Comparison & Cross-Validation
- **Multiple Algorithms**: Compare AutoML, ARIMA, Prophet, LSTM, and ensemble methods
- **Cross-Validation Methods**: Time series, k-fold, and walk-forward cross-validation
- **Performance Metrics**: MAE, RMSE, MAPE, R², AIC, BIC
- **Recommendations**: Automated recommendations for performance, efficiency, and stability

## Architecture

```
prediction-config/
├── prediction-config-service.ts    # Core configuration management
├── scenario-modeling-service.ts    # What-if analysis and scenario modeling
├── model-comparison-service.ts     # Model comparison and cross-validation
├── __tests__/                      # Comprehensive test suite
│   ├── prediction-config-service.test.ts
│   ├── scenario-modeling-service.test.ts
│   ├── model-comparison-service.test.ts
│   └── integration.test.ts
└── index.ts                        # Service exports
```

## Usage Examples

### Basic Configuration Creation

```typescript
import { PredictionConfigurationService } from '@/lib/services/prediction-config'

const configService = new PredictionConfigurationService(db)

const request = {
  config: {
    name: 'Daily Forecasting Configuration',
    description: 'Configuration for daily transcript volume forecasting',
    filters: {
      clientIds: ['client-1', 'client-2'],
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      },
      transcriptTypes: ['support', 'sales']
    },
    parameters: {
      confidenceLevel: 0.95,
      forecastHorizon: 30,
      modelAlgorithm: 'automl',
      seasonalityMode: 'auto',
      includeHolidays: true
    },
    tags: ['production', 'daily']
  }
}

const result = await configService.createConfiguration(request, userId)
```

### What-If Analysis

```typescript
import { ScenarioModelingService } from '@/lib/services/prediction-config'

const scenarioService = new ScenarioModelingService(db)

const analysis = {
  baselineConfig: myConfiguration,
  scenarios: [
    {
      id: 'growth-scenario',
      name: 'Optimistic Growth',
      variableChanges: {
        growthRate: 25,
        seasonalFactors: { 0: 1.2, 1: 1.3, 2: 1.4 },
        externalEvents: [{
          id: 'product-launch',
          name: 'Product Launch',
          startDate: new Date('2024-06-01'),
          impact: 30
        }]
      }
    }
  ],
  comparisonMetrics: ['total_volume', 'peak_value', 'volatility']
}

const results = await scenarioService.runWhatIfAnalysis(analysis)
```

### Model Comparison

```typescript
import { ModelComparisonService } from '@/lib/services/prediction-config'

const comparisonService = new ModelComparisonService(db)

const comparison = {
  name: 'Forecasting Algorithm Comparison',
  models: [
    {
      modelId: 'automl-1',
      modelName: 'Vertex AI AutoML',
      algorithm: 'automl',
      parameters: { optimizationObjective: 'minimize_rmse' },
      isBaseline: true
    },
    {
      modelId: 'arima-1',
      modelName: 'ARIMA Model',
      algorithm: 'arima',
      parameters: { order: [1, 1, 1] }
    }
  ],
  dataset: 'historical-transcripts',
  metrics: [
    { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
    { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
  ],
  crossValidationConfig: {
    method: 'time_series',
    folds: 5,
    testSize: 30
  }
}

const results = await comparisonService.runModelComparison(comparison)
```

## API Endpoints

### Configuration Management
- `GET /api/prediction-config/configurations` - Search configurations
- `POST /api/prediction-config/configurations` - Create configuration
- `GET /api/prediction-config/configurations/[id]` - Get configuration
- `PUT /api/prediction-config/configurations/[id]` - Update configuration
- `DELETE /api/prediction-config/configurations/[id]` - Delete configuration

### Templates
- `GET /api/prediction-config/templates` - Get popular templates
- `POST /api/prediction-config/templates/clone` - Clone configuration as template

### Scenario Analysis
- `POST /api/prediction-config/scenarios` - Run what-if analysis
- `GET /api/prediction-config/scenarios/templates` - Get scenario templates

### Model Comparison
- `POST /api/prediction-config/model-comparison` - Run model comparison
- `GET /api/prediction-config/model-comparison/templates` - Get comparison templates

## Database Schema

The system uses several database tables:

- `prediction_configurations` - Store user configurations
- `prediction_usage` - Track template usage for popularity
- `model_comparisons` - Store comparison experiments
- `model_comparison_results` - Store comparison results
- `scenario_analysis_results` - Store scenario analysis results
- `whatif_analysis_sessions` - Store complete what-if sessions
- `external_factors` - Store external factors for scenarios
- `prediction_validation_rules` - Store validation rules

## Validation Rules

The system includes comprehensive validation:

### Parameter Validation
- Confidence level: 0.5 - 0.99
- Forecast horizon: 1 - 365 periods
- Growth rate: -100% to 1000% (with warnings for extremes)

### Filter Validation
- Date ranges must be valid (start < end)
- Minimum 30 days recommended for historical data
- Client IDs must exist in the system

### Scenario Validation
- At least one variable change required per scenario
- External events must have valid date ranges
- Capacity constraints must have positive values

## Performance Considerations

### Caching Strategy
- Configuration results are cached for repeated requests
- Template popularity is cached and updated periodically
- Cross-validation results are cached by model and dataset

### Optimization
- Database queries use appropriate indexes
- Batch operations for multiple scenarios
- Parallel processing for model comparisons
- Efficient JSON handling for configuration storage

## Testing

The module includes comprehensive tests:

- **Unit Tests**: Individual service methods
- **Integration Tests**: Cross-service workflows
- **Performance Tests**: Large dataset handling
- **Error Handling Tests**: Edge cases and failures

Run tests with:
```bash
npm test -- --testPathPattern="prediction-config"
```

## Requirements Fulfilled

This implementation addresses the following requirements:

- **5.1**: Filtering by client, date range, transcript type, and business segments
- **5.2**: Confidence level adjustment, forecast horizon selection, and model algorithm choice
- **5.3**: What-if analysis with adjustable variables (growth rates, seasonal factors, external events)
- **5.4**: Prediction template system for saving and reusing configurations

## Future Enhancements

- Real-time scenario updates with WebSocket connections
- Advanced visualization components for scenario comparison
- Machine learning-based recommendation system for optimal configurations
- Integration with external data sources for market conditions
- Automated A/B testing for configuration optimization