// Example usage of the Automated Insight Generation Engine

import { InsightGenerationService } from './index'
import { InsightGenerationRequest } from './types'

export async function demonstrateInsightGeneration() {
  console.log('🧠 Automated Insight Generation Engine Demo')
  console.log('==========================================')

  try {
    // Example request for generating insights
    const request: InsightGenerationRequest = {
      clientId: 'demo-client-123',
      timeRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      dataTypes: ['transcripts'],
      analysisDepth: 'comprehensive',
      includeRecommendations: true,
      customFilters: {
        minConfidence: 0.6,
        includeAnomalies: true,
        focusAreas: ['trends', 'patterns', 'seasonality']
      }
    }

    console.log('📊 Generating insights for:', {
      clientId: request.clientId,
      timeRange: `${request.timeRange.startDate.toISOString().split('T')[0]} to ${request.timeRange.endDate.toISOString().split('T')[0]}`,
      analysisDepth: request.analysisDepth
    })

    // Generate insights
    const result = await InsightGenerationService.generateInsights(request)

    console.log('\n✅ Insight Generation Complete!')
    console.log(`⏱️  Processing time: ${result.processingTime}ms`)
    console.log(`🎯 Overall confidence: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`💡 Insights generated: ${result.insights.length}`)
    console.log(`📋 Recommendations: ${result.recommendations.length}`)

    // Display summary
    console.log('\n📝 Executive Summary:')
    console.log('─'.repeat(50))
    console.log(result.summary)

    // Display key insights
    console.log('\n🔍 Key Insights:')
    console.log('─'.repeat(50))
    result.insights.slice(0, 3).forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.title}`)
      console.log(`   Type: ${insight.type} | Impact: ${insight.impact} | Confidence: ${(insight.confidence * 100).toFixed(0)}%`)
      console.log(`   ${insight.description}`)
      console.log()
    })

    // Display top recommendations
    console.log('🎯 Top Recommendations:')
    console.log('─'.repeat(50))
    result.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}`)
      console.log(`   Priority: ${rec.priority} | Category: ${rec.category}`)
      console.log(`   ${rec.description}`)
      console.log(`   Expected Impact: ${rec.expectedImpact}`)
      console.log(`   Timeframe: ${rec.timeframe}`)
      console.log()
    })

    // Display trend analysis
    console.log('📈 Trend Analysis:')
    console.log('─'.repeat(50))
    console.log(`Direction: ${result.trendAnalysis.direction}`)
    console.log(`Strength: ${(result.trendAnalysis.strength * 100).toFixed(1)}%`)
    console.log(`Significance: ${(result.trendAnalysis.significance * 100).toFixed(1)}%`)
    console.log(`Change Rate: ${(result.trendAnalysis.changeRate * 100).toFixed(1)}%`)
    console.log(`Seasonal Patterns: ${result.trendAnalysis.seasonality.length}`)
    console.log(`Change Points: ${result.trendAnalysis.changePoints.length}`)

    // Display pattern recognition
    console.log('\n🔄 Pattern Recognition:')
    console.log('─'.repeat(50))
    console.log(`Patterns Detected: ${result.patternRecognition.patterns.length}`)
    console.log(`Pattern Similarities: ${result.patternRecognition.similarities.length}`)
    console.log(`Anomalies Found: ${result.patternRecognition.anomalies.length}`)
    console.log(`Cyclical Behaviors: ${result.patternRecognition.cyclicalBehavior.length}`)

    return result
  } catch (error) {
    console.error('❌ Error during insight generation:', error)
    throw error
  }
}

// Example of validating a specific insight
export async function demonstrateInsightValidation() {
  console.log('\n🔍 Insight Validation Demo')
  console.log('==========================')

  try {
    // First generate some insights
    const result = await demonstrateInsightGeneration()
    
    if (result.insights.length > 0) {
      const insight = result.insights[0]
      console.log(`\n🧪 Validating insight: "${insight.title}"`)

      // This would typically use real data from your database
      const mockData = {
        timeSeries: [
          { timestamp: new Date('2024-01-01'), value: 100 },
          { timestamp: new Date('2024-01-02'), value: 105 },
          { timestamp: new Date('2024-01-03'), value: 110 },
          // ... more data points
        ]
      }

      const response = await fetch('/api/analytics/insights/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight,
          data: mockData
        })
      })

      if (response.ok) {
        const validation = await response.json()
        console.log('✅ Validation complete!')
        console.log(`📊 Validation score: ${(validation.data.validationScore * 100).toFixed(1)}%`)
        console.log(`🎯 Historical accuracy: ${(validation.data.historicalAccuracy * 100).toFixed(1)}%`)
        console.log(`📈 Data quality: ${(validation.data.dataQuality.overall * 100).toFixed(1)}%`)
      }
    }
  } catch (error) {
    console.error('❌ Error during validation:', error)
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateInsightGeneration()
    .then(() => demonstrateInsightValidation())
    .catch(console.error)
}