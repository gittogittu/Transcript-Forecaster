# Intelligent Forecasting Engine

The Intelligent Forecasting Engine is a comprehensive forecasting system that automatically selects and combines multiple machine learning algorithms to generate accurate predictions for time-series data.

## Features

- **Automatic Algorithm Selection**: Intelligently chooses the best algorithms based on data characteristics
- **Multiple Algorithms**: Supports AutoML, ARIMA, Prophet, LSTM, and Linear Regression
- **Ensemble Methods**: Combines multiple models for improved accuracy
- **Seasonality Detection**: Automatically identifies seasonal patterns
- **Anomaly Detection**: Detects and flags unusual data points
- **Automatic Retraining**: Monitors model performance and retrains when needed
- **Confidence Intervals**: Provides uncertainty estimates for predictions

## Usage

### Basic Forecasting

```typescript
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import type { TimeSeriesData, ForecastingRequest } from '@/lib/services/forecasting/intelligent-forecasting-engine'

// Prepare your time series data
const data: TimeSeriesData = {
  timestamps: [
    new Date('2024-01-01'),
    new Date('2024-01-02'),
    new Date('2024-01-03'),
    // ... more dates
  ],
  values: [100, 105, 110, /* ... more values */],
  clientId: 'client-123'
}

// Configure the forecasting request
const request: ForecastingRequest = {
  clientId: 'client-123',
  timeHorizon: 'daily',
  periodsAhead: 30,
  confidenceLevel: 0.95,
  ensembleMethod: 'weighted_average'
}

// Generate forecast
const result = await intelligentForecastingEngine.generateForecast(data, request)

console.log('Predictions:', result.predictions)
console.log('Model used:', result.modelUsed.type)
console.log('Accuracy:', result.accuracy)
console.log('Seasonality:', result.seasonalityDetected)
```

### Custom Algorithm Selection

```typescript
const request: ForecastingRequest = {
  timeHorizon: 'weekly',
  periodsAhead: 12,
  confidenceLevel: 0.90,
  modelPreference: [
    { type: 'prophet', weight: 0.6 },
    { type: 'arima', weight: 0.4 }
  ],
  ensembleMethod: 'weighted_average'
}

const result = await intelligentForecastingEngine.generateForecast(data, request)
```

### Automatic Retraining

```typescript
const retrainingConfig = {
  performanceThreshold: 0.8, // Retrain if accuracy drops below 80%
  dataFreshnessHours: 24,     // Retrain if data is older than 24 hours
  automaticRetraining: true,
  retrainingSchedule: 'weekly'
}

const shouldRetrain = await intelligentForecastingEngine.checkAndRetrain(
  'model-id',
  newData,
  retrainingConfig
)

if (shouldRetrain) {
  console.log('Model was retrained with new data')
}
```

## API Endpoints

### Generate Forecast

```http
POST /api/forecasting/intelligent
Content-Type: application/json

{
  "data": {
    "timestamps": ["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"],
    "values": [100, 105],
    "clientId": "client-123"
  },
  "forecastRequest": {
    "timeHorizon": "daily",
    "periodsAhead": 7,
    "confidenceLevel": 0.95,
    "ensembleMethod": "weighted_average"
  }
}
```

### Get Capabilities

```http
GET /api/forecasting/intelligent?clientId=client-123
```

### Trigger Retraining

```http
POST /api/forecasting/retrain
Content-Type: application/json

{
  "modelId": "model-123",
  "newData": {
    "timestamps": ["2024-01-01T00:00:00Z"],
    "values": [100],
    "clientId": "client-123"
  },
  "config": {
    "performanceThreshold": 0.8,
    "dataFreshnessHours": 24,
    "automaticRetraining": true
  }
}
```

## Algorithm Selection Logic

The engine automatically selects algorithms based on data characteristics:

- **Small datasets (< 100 points)**: Linear Regression + ARIMA
- **Seasonal data (seasonality > 0.3)**: Prophet + ARIMA
- **Large datasets (> 500 points)**: LSTM + AutoML
- **High volatility (> 0.5)**: AutoML + LSTM
- **Default**: AutoML + Prophet

## Ensemble Methods

1. **Simple Average**: Equal weight to all models
2. **Weighted Average**: Weight by model accuracy (R² score)
3. **Stacking**: Meta-model learns optimal combination
4. **Voting**: Use best performing model only

## Performance Monitoring

The engine tracks:
- Mean Absolute Error (MAE)
- Root Mean Square Error (RMSE)
- Mean Absolute Percentage Error (MAPE)
- R-squared score
- Cross-validation score

## Error Handling

The engine handles:
- Empty or invalid data
- Missing timestamps
- Algorithm failures
- Training timeouts
- Prediction errors

## Testing

Run the test suite:

```bash
npm test -- src/lib/services/forecasting/__tests__/intelligent-forecasting-engine.test.ts
```

## Integration with Vertex AI

The engine integrates with Google Vertex AI for:
- AutoML time-series forecasting
- Custom model training
- Model deployment and serving
- Feature store management
- Model monitoring and evaluation

## Future Enhancements

- Real-time streaming predictions
- Advanced feature engineering
- Multi-dimensional forecasting
- Explainable AI insights
- Custom algorithm plugins