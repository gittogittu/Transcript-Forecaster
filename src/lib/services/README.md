# TensorFlow.js Prediction Engine

This module implements a comprehensive machine learning prediction engine using TensorFlow.js for browser and server-side execution. It provides multiple prediction models for transcript volume forecasting with data preprocessing, validation, and performance monitoring.

## Features

### 🧠 Multiple ML Models
- **Linear Regression**: Fast, interpretable predictions for linear trends
- **Polynomial Regression**: Captures non-linear patterns with configurable degree
- **ARIMA (LSTM)**: Advanced time series modeling for complex patterns

### 📊 Data Processing
- Automatic data preprocessing and normalization
- Time series aggregation (daily, weekly, monthly)
- Missing value handling and outlier detection
- Data quality analysis and recommendations

### 🎯 Prediction Capabilities
- Configurable prediction horizons (1-365 periods)
- Confidence intervals with customizable levels
- Model comparison and automatic best model selection
- Cross-validation and performance metrics

### 🔧 Performance Features
- Memory usage monitoring and optimization
- Tensor lifecycle management
- Batch processing for large datasets
- Real-time performance metrics

## Quick Start

```typescript
import { PredictionService } from '@/lib/services/prediction-service';
import { TranscriptData } from '@/types/transcript';

const service = new PredictionService();

// Generate predictions
const result = await service.generatePredictions(data, {
  clientName: 'Client A',
  predictionType: 'daily',
  periodsAhead: 30,
  modelType: 'linear',
  confidenceLevel: 0.95
});

console.log(result.result.predictions);
```

## API Reference

### PredictionService

#### `generatePredictions(data, request)`
Generates predictions using the specified model and parameters.

**Parameters:**
- `data: TranscriptData[]` - Historical transcript data
- `request: PredictionRequest` - Prediction configuration

**Returns:** `Promise<{ result: PredictionResult; validation: ValidationResult }>`

#### `trainAndValidateModel(data, request, validationSplit?)`
Trains a model with cross-validation and returns performance metrics.

**Parameters:**
- `data: TranscriptData[]` - Training data
- `request: PredictionRequest` - Model configuration
- `validationSplit?: number` - Validation split ratio (default: 0.2)

**Returns:** `Promise<TrainingResults>`

#### `compareModels(data, request)`
Compares all available models and recommends the best one.

**Parameters:**
- `data: TranscriptData[]` - Training data
- `request: Omit<PredictionRequest, 'modelType'>` - Configuration without model type

**Returns:** `Promise<ModelComparison>`

#### `validateRequest(data, request)`
Validates a prediction request and returns validation results.

**Parameters:**
- `data: TranscriptData[]` - Input data
- `request: PredictionRequest` - Request to validate

**Returns:** `ValidationResult`

### PredictionEngine

Lower-level engine for direct model access and advanced usage.

#### `preprocessData(data, predictionType, clientName?)`
Preprocesses data for model training and prediction.

#### `generatePredictions(data, options)`
Core prediction generation with specified options.

#### `validatePredictions(trainingData, testData, options)`
Validates model performance against test data.

## Data Types

### PredictionRequest
```typescript
interface PredictionRequest {
  clientName?: string;
  predictionType: 'daily' | 'weekly' | 'monthly';
  periodsAhead: number;
  modelType: 'linear' | 'polynomial' | 'arima';
  confidenceLevel?: number;
}
```

### PredictionResult
```typescript
interface PredictionResult {
  id: string;
  clientName: string;
  predictionType: 'daily' | 'weekly' | 'monthly';
  predictions: TimePrediction[];
  confidence: number;
  accuracy: number;
  modelType: 'linear' | 'polynomial' | 'arima';
  createdAt: Date;
}
```

### TimePrediction
```typescript
interface TimePrediction {
  date: Date;
  predictedCount: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}
```

## React Hook Usage

The `usePredictions` hook provides a React-friendly interface:

```typescript
import { usePredictions } from '@/lib/hooks/use-predictions';

function PredictionComponent() {
  const {
    generatePredictions,
    trainModel,
    compareModels,
    isGenerating,
    error,
    lastPrediction
  } = usePredictions();

  const handlePredict = async () => {
    const result = await generatePredictions(data, {
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear'
    });
  };

  return (
    <div>
      <button onClick={handlePredict} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Predict'}
      </button>
      {error && <div>Error: {error}</div>}
      {lastPrediction && <PredictionResults data={lastPrediction} />}
    </div>
  );
}
```

## Model Details

### Linear Regression
- **Use Case**: Simple linear trends, fast predictions
- **Training Time**: ~100-200ms for small datasets
- **Memory Usage**: Low
- **Accuracy**: Good for linear patterns

### Polynomial Regression
- **Use Case**: Non-linear patterns, seasonal variations
- **Training Time**: ~200-500ms for small datasets
- **Memory Usage**: Medium
- **Accuracy**: Better for complex patterns

### ARIMA (LSTM Implementation)
- **Use Case**: Complex time series with dependencies
- **Training Time**: ~1-3 seconds for small datasets
- **Memory Usage**: High
- **Accuracy**: Best for time series patterns

## Data Requirements

### Minimum Data Points
- **Daily predictions**: 14+ data points
- **Weekly predictions**: 8+ data points  
- **Monthly predictions**: 6+ data points

### Data Quality
- No negative transcript counts
- Consistent date formatting
- Minimal missing values (<10% recommended)
- Recent data (within 30 days recommended)

## Performance Considerations

### Memory Management
```typescript
// Monitor memory usage
const memoryInfo = service.getMemoryUsage();
console.log(`Tensors: ${memoryInfo.numTensors}, Memory: ${memoryInfo.numBytes} bytes`);

// Cleanup when done
service.dispose();
```

### Batch Processing
For large datasets, consider:
- Processing in smaller chunks
- Using appropriate validation splits
- Monitoring memory usage during training

### Browser vs Server
- **Browser**: WebGL backend for better performance
- **Server**: CPU backend (Node.js environment)
- Automatic fallback to CPU if WebGL unavailable

## Error Handling

Common errors and solutions:

### "Insufficient data for predictions"
- Ensure minimum data points for prediction type
- Check data quality and completeness

### "WebGL not supported"
- Automatic fallback to CPU backend
- Performance may be slower but functionality preserved

### "Model training failed"
- Check data quality and preprocessing
- Verify model parameters are appropriate for dataset size

## Testing

Comprehensive test suite includes:
- Unit tests for all prediction models
- Integration tests for service layer
- Performance benchmarks
- Memory usage validation
- Edge case handling

Run tests:
```bash
npm test -- --testPathPattern="prediction"
```

## Examples

See `src/components/analytics/prediction-demo.tsx` for a complete React component demonstrating all features.

## Dependencies

- `@tensorflow/tfjs`: Core TensorFlow.js library
- `@tanstack/react-query`: Data fetching and caching (for React hook)
- Custom types from `@/types/transcript`

## Browser Compatibility

- Modern browsers with WebGL support (recommended)
- Fallback to CPU backend for older browsers
- Node.js environment supported for server-side usage