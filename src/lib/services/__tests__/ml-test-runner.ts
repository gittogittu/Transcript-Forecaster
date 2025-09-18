/**
 * ML Test Runner - Comprehensive Test Execution for Task 19
 * 
 * Orchestrates execution of all ML component tests:
 * - Unit tests for Vertex AI integration and model management
 * - Integration tests for prediction pipeline and feature engineering
 * - Accuracy tests for anomaly detection and forecasting models
 * - Performance tests for vector similarity search and caching
 * - End-to-end tests for complete prediction workflows
 */

import { execSync } from 'child_process'
import { performance } from 'perf_hooks'

interface TestSuite {
  name: string
  pattern: string
  description: string
  timeout?: number
}

interface TestResult {
  suite: string
  passed: boolean
  duration: number
  coverage?: number
  errors?: string[]
}

class MLTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Vertex AI Integration',
      pattern: 'src/lib/services/vertex-ai/__tests__/**/*.test.ts',
      description: 'Unit tests for Vertex AI integration and model management',
      timeout: 60000
    },
    {
      name: 'Model Accuracy Validation',
      pattern: 'src/lib/services/vertex-ai/__tests__/model-accuracy-validation.test.ts',
      description: 'Accuracy tests for ML models and validation metrics',
      timeout: 120000
    },
    {
      name: 'Anomaly Detection',
      pattern: 'src/lib/services/anomaly-detection/__tests__/**/*.test.ts',
      description: 'Tests for anomaly detection algorithms and real-time monitoring',
      timeout: 90000
    },
    {
      name: 'Forecasting Engine',
      pattern: 'src/lib/services/forecasting/__tests__/**/*.test.ts',
      description: 'Tests for intelligent forecasting and prediction algorithms',
      timeout: 90000
    },
    {
      name: 'Vector Embeddings',
      pattern: 'src/lib/services/embeddings/__tests__/**/*.test.ts',
      description: 'Tests for embedding generation and similarity search',
      timeout: 60000
    },
    {
      name: 'Vector Performance Benchmarks',
      pattern: 'src/lib/services/embeddings/__tests__/performance-benchmarks.test.ts',
      description: 'Performance tests for vector operations and caching',
      timeout: 180000
    },
    {
      name: 'Feature Engineering',
      pattern: 'src/lib/services/feature-engineering/__tests__/**/*.test.ts',
      description: 'Tests for feature extraction and preprocessing pipeline',
      timeout: 60000
    },
    {
      name: 'Adaptive Modeling',
      pattern: 'src/lib/services/adaptive-modeling/__tests__/**/*.test.ts',
      description: 'Tests for adaptive modeling and concept drift detection',
      timeout: 90000
    },
    {
      name: 'Performance Monitoring',
      pattern: 'src/lib/services/performance-monitoring/__tests__/**/*.test.ts',
      description: 'Tests for ML model performance monitoring and alerting',
      timeout: 60000
    },
    {
      name: 'Prediction Configuration',
      pattern: 'src/lib/services/prediction-config/__tests__/**/*.test.ts',
      description: 'Tests for prediction configuration and scenario modeling',
      timeout: 60000
    },
    {
      name: 'Correlation Analysis',
      pattern: 'src/lib/services/correlation-analysis/__tests__/**/*.test.ts',
      description: 'Tests for correlation analysis and feature importance',
      timeout: 60000
    },
    {
      name: 'Insight Generation',
      pattern: 'src/lib/services/insight-generation/__tests__/**/*.test.ts',
      description: 'Tests for automated insight generation and recommendations',
      timeout: 60000
    },
    {
      name: 'End-to-End Workflows',
      pattern: 'src/lib/services/__tests__/end-to-end-prediction-workflows.test.ts',
      description: 'Integration tests for complete prediction workflows',
      timeout: 300000
    },
    {
      name: 'ML Model Validation Suite',
      pattern: 'src/lib/services/__tests__/ml-model-validation-suite.test.ts',
      description: 'Comprehensive model validation and comparison tests',
      timeout: 240000
    }
  ]

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Comprehensive ML Test Suite (Task 19)')
    console.log('=' .repeat(60))
    
    const results: TestResult[] = []
    const overallStartTime = performance.now()

    for (const suite of this.testSuites) {
      console.log(`\n📋 Running: ${suite.name}`)
      console.log(`📝 Description: ${suite.description}`)
      console.log(`⏱️  Timeout: ${suite.timeout ? suite.timeout / 1000 : 60}s`)
      
      const result = await this.runTestSuite(suite)
      results.push(result)
      
      if (result.passed) {
        console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(2)}s)`)
      } else {
        console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(2)}s)`)
        if (result.errors) {
          result.errors.forEach(error => console.log(`   🔸 ${error}`))
        }
      }
    }

    const overallEndTime = performance.now()
    const totalDuration = (overallEndTime - overallStartTime) / 1000

    this.printSummary(results, totalDuration)
    return results
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = performance.now()
    
    try {
      const command = `npx jest "${suite.pattern}" --coverage --verbose --testTimeout=${suite.timeout || 60000}`
      
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: suite.timeout || 60000
      })

      const endTime = performance.now()
      const duration = (endTime - startTime) / 1000

      // Parse coverage from output if available
      const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : undefined

      return {
        suite: suite.name,
        passed: true,
        duration,
        coverage
      }
    } catch (error: any) {
      const endTime = performance.now()
      const duration = (endTime - startTime) / 1000

      const errorOutput = error.stdout || error.stderr || error.message
      const errors = this.parseTestErrors(errorOutput)

      return {
        suite: suite.name,
        passed: false,
        duration,
        errors
      }
    }
  }

  private parseTestErrors(output: string): string[] {
    const errors: string[] = []
    
    // Extract failed test information
    const failedTestRegex = /● (.+?)(?=\n\n|\n●|\nTest Suites:)/gs
    const matches = output.match(failedTestRegex)
    
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/●/g, '').trim()
        if (cleanMatch.length > 0) {
          errors.push(cleanMatch.substring(0, 200) + (cleanMatch.length > 200 ? '...' : ''))
        }
      })
    }

    // If no specific test errors found, extract general error
    if (errors.length === 0 && output.includes('FAIL')) {
      const lines = output.split('\n')
      const errorLines = lines.filter(line => 
        line.includes('Error:') || 
        line.includes('FAIL') || 
        line.includes('Expected') ||
        line.includes('Received')
      )
      
      errors.push(...errorLines.slice(0, 5).map(line => line.trim()))
    }

    return errors.length > 0 ? errors : ['Unknown test failure']
  }

  private printSummary(results: TestResult[], totalDuration: number): void {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 ML TEST SUITE SUMMARY')
    console.log('=' .repeat(60))

    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length
    const totalTests = results.length

    console.log(`\n📈 Overall Results:`)
    console.log(`   ✅ Passed: ${passed}/${totalTests} test suites`)
    console.log(`   ❌ Failed: ${failed}/${totalTests} test suites`)
    console.log(`   ⏱️  Total Duration: ${totalDuration.toFixed(2)}s`)

    // Coverage summary
    const coverageResults = results.filter(r => r.coverage !== undefined)
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      console.log(`   📊 Average Coverage: ${avgCoverage.toFixed(1)}%`)
    }

    console.log(`\n📋 Detailed Results:`)
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : ''
      console.log(`   ${status} ${result.suite}: ${result.duration.toFixed(2)}s${coverage}`)
    })

    if (failed > 0) {
      console.log(`\n🔍 Failed Test Details:`)
      results.filter(r => !r.passed).forEach(result => {
        console.log(`\n❌ ${result.suite}:`)
        result.errors?.forEach(error => {
          console.log(`   🔸 ${error}`)
        })
      })
    }

    console.log('\n' + '=' .repeat(60))
    
    if (failed === 0) {
      console.log('🎉 ALL ML TESTS PASSED! Task 19 implementation is complete.')
      console.log('✨ The comprehensive ML testing suite validates:')
      console.log('   • Vertex AI integration and model management')
      console.log('   • Prediction pipeline accuracy and performance')
      console.log('   • Vector similarity search optimization')
      console.log('   • End-to-end workflow reliability')
      console.log('   • Model validation and comparison capabilities')
    } else {
      console.log(`⚠️  ${failed} test suite(s) failed. Please review and fix issues.`)
      process.exit(1)
    }
  }

  async runSpecificSuite(suiteName: string): Promise<TestResult | null> {
    const suite = this.testSuites.find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    )

    if (!suite) {
      console.log(`❌ Test suite "${suiteName}" not found.`)
      console.log('Available suites:')
      this.testSuites.forEach(s => console.log(`   • ${s.name}`))
      return null
    }

    console.log(`🚀 Running specific test suite: ${suite.name}`)
    const result = await this.runTestSuite(suite)
    
    if (result.passed) {
      console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(2)}s)`)
    } else {
      console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(2)}s)`)
      result.errors?.forEach(error => console.log(`   🔸 ${error}`))
    }

    return result
  }

  listTestSuites(): void {
    console.log('📋 Available ML Test Suites:')
    console.log('=' .repeat(50))
    
    this.testSuites.forEach((suite, index) => {
      console.log(`\n${index + 1}. ${suite.name}`)
      console.log(`   📝 ${suite.description}`)
      console.log(`   📁 Pattern: ${suite.pattern}`)
      console.log(`   ⏱️  Timeout: ${suite.timeout ? suite.timeout / 1000 : 60}s`)
    })
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MLTestRunner()
  const args = process.argv.slice(2)

  if (args.length === 0) {
    runner.runAllTests().catch(console.error)
  } else if (args[0] === 'list') {
    runner.listTestSuites()
  } else if (args[0] === 'run' && args[1]) {
    runner.runSpecificSuite(args[1]).catch(console.error)
  } else {
    console.log('Usage:')
    console.log('  npm run test:ml              # Run all ML tests')
    console.log('  npm run test:ml list          # List available test suites')
    console.log('  npm run test:ml run <suite>   # Run specific test suite')
  }
}

export { MLTestRunner }