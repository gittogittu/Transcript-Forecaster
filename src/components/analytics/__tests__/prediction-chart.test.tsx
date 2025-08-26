import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PredictionChart } from '../prediction-chart'
import { TranscriptData } from '@/types/transcript'

// Mock Recharts components
jest.mock('recharts', () => ({
  ComposedChart: ({ children, data }: any) => (
    <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, strokeDasharray, name }: any) => (
    <div 
      data-testid={`line-${dataKey}`} 
      data-stroke={stroke}
      data-dash={strokeDasharray}
      data-name={name}
    />
  ),
  Area: ({ dataKey, fill }: any) => (
    <div data-testid={`area-${dataKey}`} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ label }: any) => (
    <div data-testid="y-axis" data-label={label?.value} />
  ),
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: ({ label }: any) => (
    <div data-testid="reference-line" data-label={label?.value} />
  )
}))

const mockHistoricalData: TranscriptData[] = [
  {
    clientName: 'Client A',
    month: '01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    clientName: 'Client A',
    month: '02',
    year: 2024,
    transcriptCount: 120,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
]

const mockPredictionData = [
  {
    clientName: 'Client A',
    month: '03',
    year: 2024,
    predictedCount: 130,
    confidenceInterval: {
      lower: 120,
      upper: 140
    }
  },
  {
    clientName: 'Client A',
    month: '04',
    year: 2024,
    predictedCount: 135,
    confidenceInterval: {
      lower: 125,
      upper: 145
    }
  }
]

describe('PredictionChart', () => {
  it('renders chart with basic props', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData} 
      />
    )
    
    expect(screen.getByText('Prediction Analysis')).toBeInTheDocument()
    expect(screen.getByText(/Historical data and future predictions/)).toBeInTheDocument()
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
  })

  it('combines historical and prediction data correctly', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData} 
      />
    )
    
    const chartElement = screen.getByTestId('composed-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData).toHaveLength(4) // 2 historical + 2 prediction months
    
    // Check historical data
    const jan2024 = chartData.find((d: any) => d.month === '2024-01')
    expect(jan2024).toHaveProperty('historical', 100)
    expect(jan2024).toHaveProperty('isPrediction', false)
    
    // Check prediction data
    const mar2024 = chartData.find((d: any) => d.month === '2024-03')
    expect(mar2024).toHaveProperty('predicted', 130)
    expect(mar2024).toHaveProperty('confidenceLower', 120)
    expect(mar2024).toHaveProperty('confidenceUpper', 140)
    expect(mar2024).toHaveProperty('isPrediction', true)
  })

  it('renders historical line when showHistorical is true', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        showHistorical={true}
      />
    )
    
    expect(screen.getByTestId('line-historical')).toBeInTheDocument()
  })

  it('hides historical line when showHistorical is false', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        showHistorical={false}
      />
    )
    
    expect(screen.queryByTestId('line-historical')).not.toBeInTheDocument()
  })

  it('renders prediction line with dashed style', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData} 
      />
    )
    
    const predictionLine = screen.getByTestId('line-predicted')
    expect(predictionLine).toHaveAttribute('data-dash', '5 5')
    expect(predictionLine).toHaveAttribute('data-name', 'Predictions')
  })

  it('renders confidence interval area when enabled', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        showConfidenceInterval={true}
      />
    )
    
    expect(screen.getByTestId('area-confidenceUpper')).toBeInTheDocument()
  })

  it('hides confidence interval when disabled', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        showConfidenceInterval={false}
      />
    )
    
    expect(screen.queryByTestId('area-confidenceUpper')).not.toBeInTheDocument()
  })

  it('filters data by selected client', () => {
    const multiClientHistorical = [
      ...mockHistoricalData,
      {
        clientName: 'Client B',
        month: '01',
        year: 2024,
        transcriptCount: 80,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ]
    
    const multiClientPredictions = [
      ...mockPredictionData,
      {
        clientName: 'Client B',
        month: '03',
        year: 2024,
        predictedCount: 85,
        confidenceInterval: { lower: 75, upper: 95 }
      }
    ]
    
    render(
      <PredictionChart 
        historicalData={multiClientHistorical} 
        predictionData={multiClientPredictions}
        selectedClient="Client A"
      />
    )
    
    const chartElement = screen.getByTestId('composed-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    // Should only have Client A data
    const jan2024 = chartData.find((d: any) => d.month === '2024-01')
    expect(jan2024).toHaveProperty('historical', 100) // Only Client A's data
    
    const mar2024 = chartData.find((d: any) => d.month === '2024-03')
    expect(mar2024).toHaveProperty('predicted', 130) // Only Client A's prediction
  })

  it('updates description with selected client name', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        selectedClient="Client A"
      />
    )
    
    expect(screen.getByText(/for Client A/)).toBeInTheDocument()
  })

  it('shows confidence interval in description when enabled', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        showConfidenceInterval={true}
      />
    )
    
    expect(screen.getByText(/with confidence intervals/)).toBeInTheDocument()
  })

  it('renders reference line to separate historical from predictions', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData} 
      />
    )
    
    const referenceLine = screen.getByTestId('reference-line')
    expect(referenceLine).toHaveAttribute('data-label', 'Prediction Start')
  })

  it('handles empty data gracefully', () => {
    render(
      <PredictionChart 
        historicalData={[]} 
        predictionData={[]} 
      />
    )
    
    expect(screen.getByText('Prediction Analysis')).toBeInTheDocument()
    const chartElement = screen.getByTestId('composed-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    expect(chartData).toHaveLength(0)
  })

  it('sorts data chronologically', () => {
    const unsortedHistorical = [mockHistoricalData[1], mockHistoricalData[0]]
    const unsortedPredictions = [mockPredictionData[1], mockPredictionData[0]]
    
    render(
      <PredictionChart 
        historicalData={unsortedHistorical} 
        predictionData={unsortedPredictions} 
      />
    )
    
    const chartElement = screen.getByTestId('composed-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData[0].month).toBe('2024-01')
    expect(chartData[1].month).toBe('2024-02')
    expect(chartData[2].month).toBe('2024-03')
    expect(chartData[3].month).toBe('2024-04')
  })

  it('applies custom height', () => {
    render(
      <PredictionChart 
        historicalData={mockHistoricalData} 
        predictionData={mockPredictionData}
        height={600}
      />
    )
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})