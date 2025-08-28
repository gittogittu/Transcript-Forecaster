'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Brain, BarChart3 } from 'lucide-react';
import { usePredictions } from '@/lib/hooks/use-predictions';
import { TranscriptData } from '@/types/transcript';

// Mock data for demonstration
const mockData: TranscriptData[] = [
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
    transcriptCount: 15,
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
    transcriptCount: 20,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1'
  }
];

export function PredictionDemo() {
  const [modelType, setModelType] = useState<'linear' | 'polynomial' | 'arima'>('linear');
  const [predictionType, setPredictionType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [periodsAhead, setPeriodsAhead] = useState(7);

  const {
    generatePredictions,
    trainModel,
    compareModels,
    validateRequest,
    isGenerating,
    isValidating,
    isComparing,
    error,
    validation,
    memoryUsage,
    lastPrediction,
    lastTraining,
    lastComparison,
    clearError
  } = usePredictions();

  const handleGeneratePredictions = async () => {
    const request = {
      clientName: 'Client A',
      predictionType,
      periodsAhead,
      modelType,
      confidenceLevel: 0.95
    };

    // Validate first
    const validationResult = validateRequest(mockData, request);
    if (!validationResult.isValid) {
      return;
    }

    await generatePredictions(mockData, request);
  };

  const handleTrainModel = async () => {
    const request = {
      clientName: 'Client A',
      predictionType,
      periodsAhead,
      modelType,
      confidenceLevel: 0.95
    };

    await trainModel(mockData, request, 0.2);
  };

  const handleCompareModels = async () => {
    const request = {
      clientName: 'Client A',
      predictionType,
      periodsAhead
    };

    await compareModels(mockData, request);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            TensorFlow.js Prediction Engine Demo
          </CardTitle>
          <CardDescription>
            Demonstrate machine learning predictions with linear, polynomial, and ARIMA models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model Type</label>
              <Select value={modelType} onValueChange={(value: any) => setModelType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear Regression</SelectItem>
                  <SelectItem value="polynomial">Polynomial Regression</SelectItem>
                  <SelectItem value="arima">ARIMA (LSTM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prediction Type</label>
              <Select value={predictionType} onValueChange={(value: any) => setPredictionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Periods Ahead</label>
              <Select value={periodsAhead.toString()} onValueChange={(value) => setPeriodsAhead(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="14">14</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGeneratePredictions} 
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Generate Predictions
            </Button>

            <Button 
              onClick={handleTrainModel} 
              disabled={isValidating}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              Train & Validate
            </Button>

            <Button 
              onClick={handleCompareModels} 
              disabled={isComparing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Compare Models
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-start">
                <p className="text-sm text-red-600">{error}</p>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={validation.isValid ? "default" : "destructive"}>
                  {validation.isValid ? "Valid" : "Invalid"}
                </Badge>
                <span className="text-sm text-muted-foreground">Request Validation</span>
              </div>
              
              {validation.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600">Errors:</p>
                  {validation.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">• {error}</p>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-600">Warnings:</p>
                  {validation.warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-yellow-600">• {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Memory Usage */}
          {memoryUsage && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Memory: {memoryUsage.numTensors} tensors, {Math.round(memoryUsage.numBytes / 1024)} KB</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction Results */}
        {lastPrediction && (
          <Card>
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
              <CardDescription>
                Model: {lastPrediction.result.modelType} | Accuracy: {lastPrediction.result.accuracy.toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lastPrediction.result.predictions.slice(0, 5).map((pred, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">
                      {pred.date.toLocaleDateString()}
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{pred.predictedCount}</div>
                      <div className="text-xs text-muted-foreground">
                        {pred.confidenceInterval.lower}-{pred.confidenceInterval.upper}
                      </div>
                    </div>
                  </div>
                ))}
                {lastPrediction.result.predictions.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    ... and {lastPrediction.result.predictions.length - 5} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Results */}
        {lastTraining && (
          <Card>
            <CardHeader>
              <CardTitle>Training Results</CardTitle>
              <CardDescription>Model validation metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Training Accuracy:</span>
                  <span className="font-medium">{lastTraining.trainingMetrics.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Validation Accuracy:</span>
                  <span className="font-medium">{lastTraining.validationMetrics.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cross-Validation Score:</span>
                  <span className="font-medium">{lastTraining.crossValidationScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>RMSE:</span>
                  <span className="font-medium">{lastTraining.validationMetrics.rmse.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>R²:</span>
                  <span className="font-medium">{lastTraining.validationMetrics.r2.toFixed(3)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Comparison */}
        {lastComparison && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>
                Best Model: {lastComparison.bestModel} | {lastComparison.recommendation}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(lastComparison.results).map(([model, result]) => (
                  <div key={model} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{model}</h4>
                      {model === lastComparison.bestModel && (
                        <Badge variant="default">Best</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span>{result.metrics.accuracy.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>RMSE:</span>
                        <span>{result.metrics.rmse.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>R²:</span>
                        <span>{result.metrics.r2.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}