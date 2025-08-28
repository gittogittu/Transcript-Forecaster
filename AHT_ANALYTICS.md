# Average Handle Time (AHT) Analytics

This document provides comprehensive information about the Average Handle Time analytics functionality in the Transcript Analytics Platform.

## Overview

The AHT analytics system provides detailed performance metrics for client operations, tracking multiple dimensions of handle time and providing trend analysis for operational efficiency insights.

## Data Types

### AHTData Interface

The core data structure for storing client AHT information:

```typescript
interface AHTData {
  client: string                    // Client identifier
  overallAHT: number               // Overall average handle time (minutes)
  reviewAHT: number                // Review process AHT (minutes)
  validationAHT: number            // Validation process AHT (minutes)
  monthlyData: {
    [key: string]: number          // Monthly volume data (e.g., "2024_Jun": 252)
  }
  grandTotal: number               // Total volume across all months
}
```

### AHTSummary Interface

Summary statistics for AHT analysis across all clients:

```typescript
interface AHTSummary {
  totalClients: number             // Total number of clients
  averageAHT: number              // Average AHT across all clients
  medianAHT: number               // Median AHT value
  highestAHT: {                   // Client with highest AHT
    client: string
    value: number
  }
  lowestAHT: {                    // Client with lowest AHT
    client: string
    value: number
  }
  totalVolume: number             // Total volume across all clients
}
```

### MonthlyTrend Interface

Monthly trend analysis for AHT performance:

```typescript
interface MonthlyTrend {
  month: string                   // Month identifier (YYYY-MM format)
  totalVolume: number            // Total volume for the month
  averageAHT: number             // Average AHT for the month
  clientCount: number            // Number of active clients
}
```

### ClientPerformance Interface

Individual client performance metrics with trend analysis:

```typescript
interface ClientPerformance {
  client: string                  // Client identifier
  overallAHT: number             // Current overall AHT
  trend: 'increasing' | 'decreasing' | 'stable'  // Performance trend
  trendPercentage: number        // Percentage change in trend
  riskLevel: 'low' | 'medium' | 'high'          // Risk assessment
  monthlyVolumes: Array<{        // Historical volume data
    month: string
    volume: number
  }>
}
```

## Key Features

### Multi-Dimensional AHT Tracking

The system tracks three distinct AHT metrics:

1. **Overall AHT**: Complete end-to-end handle time
2. **Review AHT**: Time spent in review processes
3. **Validation AHT**: Time spent in validation processes

This separation allows for detailed analysis of where time is being spent in the workflow.

### Monthly Volume Correlation

AHT data includes monthly volume information to analyze the relationship between:
- Transaction volume and handle time efficiency
- Seasonal patterns in performance
- Capacity planning insights

### Performance Trend Analysis

The system automatically calculates:
- **Trend Direction**: Whether AHT is increasing, decreasing, or stable
- **Trend Percentage**: Quantified change over time
- **Risk Assessment**: Automatic categorization of performance risk levels

### Summary Statistics

Comprehensive summary statistics include:
- Average and median AHT across all clients
- Identification of top and bottom performers
- Total volume aggregation
- Client count tracking

## Integration Points

### With Transcript Analytics

AHT data integrates seamlessly with existing transcript analytics:

```typescript
// Combined analysis example
interface CombinedClientMetrics {
  client: string
  transcriptVolume: number
  ahtMetrics: AHTData
  efficiency: number  // Calculated from volume/AHT ratio
}
```

### With Predictive Analytics

AHT trends can be used for:
- Predicting future performance issues
- Capacity planning based on efficiency trends
- Early warning systems for performance degradation

### With Dashboard Components

AHT data can be visualized using existing chart components:
- Trend charts for AHT over time
- Performance comparison charts
- Risk level indicators

## Data Sources

### Google Sheets Integration

AHT data can be imported from Google Sheets with the following structure:

| Client | Overall AHT | Review AHT | Validation AHT | 2024_Jan | 2024_Feb | ... | Grand Total |
|--------|-------------|------------|----------------|----------|----------|-----|-------------|
| Client A | 15.5 | 8.2 | 7.3 | 150 | 175 | ... | 485 |

### Database Storage

When using database storage, AHT data can be stored in dedicated tables:

```sql
-- AHT metrics table
CREATE TABLE aht_metrics (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(100) NOT NULL,
  overall_aht DECIMAL(10,2) NOT NULL,
  review_aht DECIMAL(10,2) NOT NULL,
  validation_aht DECIMAL(10,2) NOT NULL,
  grand_total INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly volume data table
CREATE TABLE aht_monthly_volumes (
  id SERIAL PRIMARY KEY,
  aht_metric_id INTEGER REFERENCES aht_metrics(id),
  month VARCHAR(10) NOT NULL, -- Format: YYYY_MMM
  volume INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Basic AHT Analysis

```typescript
import { AHTData, AHTSummary } from '@/types/aht'

// Calculate efficiency metrics
function calculateEfficiency(ahtData: AHTData[]): AHTSummary {
  const totalClients = ahtData.length
  const ahtValues = ahtData.map(d => d.overallAHT)
  
  return {
    totalClients,
    averageAHT: ahtValues.reduce((sum, val) => sum + val, 0) / totalClients,
    medianAHT: calculateMedian(ahtValues),
    highestAHT: findHighest(ahtData),
    lowestAHT: findLowest(ahtData),
    totalVolume: ahtData.reduce((sum, d) => sum + d.grandTotal, 0)
  }
}
```

### Trend Analysis

```typescript
import { ClientPerformance, MonthlyTrend } from '@/types/aht'

// Analyze client performance trends
function analyzeClientTrend(
  client: string, 
  historicalData: AHTData[]
): ClientPerformance {
  const clientData = historicalData.filter(d => d.client === client)
  const trend = calculateTrend(clientData)
  
  return {
    client,
    overallAHT: clientData[clientData.length - 1].overallAHT,
    trend: trend.direction,
    trendPercentage: trend.percentage,
    riskLevel: assessRiskLevel(trend),
    monthlyVolumes: extractMonthlyVolumes(clientData)
  }
}
```

### Risk Assessment

```typescript
function assessRiskLevel(ahtData: AHTData): 'low' | 'medium' | 'high' {
  const { overallAHT, trend } = ahtData
  
  if (overallAHT > 20 || trend === 'increasing') {
    return 'high'
  } else if (overallAHT > 15 || trend === 'stable') {
    return 'medium'
  }
  return 'low'
}
```

## API Integration

### Planned API Endpoints

The following API endpoints are planned for AHT functionality:

- `GET /api/aht` - Fetch all AHT data
- `POST /api/aht` - Add/update AHT data
- `GET /api/aht/summary` - Get summary statistics
- `GET /api/aht/trends` - Get trend analysis
- `GET /api/aht/client/:clientName` - Get client-specific AHT data

### Response Formats

All AHT API endpoints follow the consistent response format:

```typescript
interface AHTApiResponse<T> {
  data: T | null
  success: boolean
  error?: string
  metadata?: {
    totalRecords?: number
    lastUpdated?: string
    dataSource?: 'google-sheets' | 'database'
  }
}
```

## Performance Considerations

### Data Volume

AHT data includes monthly breakdowns which can grow large over time:
- Consider data archiving strategies for historical data
- Implement pagination for large datasets
- Use efficient indexing for client and date-based queries

### Calculation Efficiency

Trend calculations and risk assessments should be:
- Cached when possible
- Calculated incrementally for new data
- Optimized for real-time dashboard updates

### Memory Usage

When processing large AHT datasets:
- Stream data processing for bulk operations
- Implement data chunking for large imports
- Monitor memory usage during trend calculations

## Future Enhancements

### Advanced Analytics

Planned enhancements include:
- Predictive AHT modeling using machine learning
- Seasonal pattern detection and forecasting
- Anomaly detection for performance issues
- Benchmarking against industry standards

### Integration Improvements

Future integration points:
- Real-time AHT data streaming
- Integration with workforce management systems
- Automated alerting for performance thresholds
- Custom dashboard widgets for AHT metrics

### Reporting Features

Enhanced reporting capabilities:
- Automated AHT performance reports
- Client-specific performance dashboards
- Executive summary reports with key insights
- Exportable performance analytics

## Best Practices

### Data Quality

- Validate AHT data for reasonable ranges (e.g., 1-60 minutes)
- Implement data consistency checks across AHT dimensions
- Monitor for missing or incomplete monthly data
- Establish data refresh schedules for accuracy

### Performance Monitoring

- Track API response times for AHT endpoints
- Monitor calculation performance for large datasets
- Implement caching strategies for frequently accessed data
- Set up alerts for data processing failures

### User Experience

- Provide clear visualizations for AHT trends
- Implement progressive loading for large datasets
- Offer filtering and sorting capabilities
- Include contextual help for AHT metrics interpretation

## Troubleshooting

### Common Issues

1. **Missing Monthly Data**: Ensure all months have corresponding volume data
2. **Inconsistent AHT Values**: Validate that review + validation AHT ≤ overall AHT
3. **Performance Issues**: Consider data pagination and caching for large datasets
4. **Trend Calculation Errors**: Verify sufficient historical data for trend analysis

### Error Handling

AHT operations use structured error handling:

```typescript
interface AHTError extends AppError {
  name: 'AHTError'
  code: 'AHT_ERROR'
  client?: string
  metric?: string
}
```

### Debugging

Enable detailed logging for AHT operations:
- Data validation results
- Trend calculation steps
- Performance metrics
- Error context and stack traces