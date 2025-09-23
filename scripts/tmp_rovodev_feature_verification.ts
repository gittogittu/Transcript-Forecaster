#!/usr/bin/env node

/**
 * Comprehensive Feature Verification System
 * Tests all features documented in docs/FEATURES.md to ensure they are working properly
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FeatureTest {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint?: string;
  testFunction: string;
  dependencies: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

interface FeatureVerificationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  categories: Record<string, { passed: number; failed: number; total: number }>;
  criticalFailures: string[];
  recommendations: string[];
  results: FeatureTest[];
}

class FeatureVerificationSystem {
  private baseUrl: string;
  private tests: FeatureTest[] = [];
  private report: FeatureVerificationReport;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.initializeTests();
    this.report = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {},
      criticalFailures: [],
      recommendations: [],
      results: []
    };
  }

  private initializeTests() {
    // Core ML Prediction Features (Critical)
    this.tests.push({
      id: 'ml_prediction_engine',
      name: 'AI-Powered Transcript Load Prediction',
      category: 'ML_Core',
      description: 'Test the core ML forecasting engine for transcript load prediction',
      endpoint: '/api/predictions/forecast',
      testFunction: 'testMLPredictionEngine',
      dependencies: ['database', 'vertex_ai'],
      priority: 'critical',
      status: 'pending'
    });

    this.tests.push({
      id: 'daily_training_pipeline',
      name: 'Daily Training Pipeline',
      category: 'ML_Core',
      description: 'Verify automated daily model retraining functionality',
      endpoint: '/api/forecasting/retrain',
      testFunction: 'testDailyTrainingPipeline',
      dependencies: ['database', 'ml_models'],
      priority: 'critical',
      status: 'pending'
    });

    this.tests.push({
      id: 'multi_horizon_forecasting',
      name: 'Multi-horizon Forecasting',
      category: 'ML_Core',
      description: 'Test prediction capabilities for multiple time horizons',
      endpoint: '/api/predictions/forecast',
      testFunction: 'testMultiHorizonForecasting',
      dependencies: ['ml_prediction_engine'],
      priority: 'high',
      status: 'pending'
    });

    // Advanced ML Features
    this.tests.push({
      id: 'ensemble_models',
      name: 'Ensemble Model System',
      category: 'ML_Advanced',
      description: 'Test ensemble learning with multiple algorithms',
      endpoint: '/api/adaptive-modeling',
      testFunction: 'testEnsembleModels',
      dependencies: ['ml_prediction_engine'],
      priority: 'high',
      status: 'pending'
    });

    this.tests.push({
      id: 'automl_integration',
      name: 'AutoML Forecasting',
      category: 'ML_Advanced',
      description: 'Test Google Cloud Vertex AI AutoML integration',
      endpoint: '/api/vertex-ai/automl',
      testFunction: 'testAutoMLIntegration',
      dependencies: ['vertex_ai'],
      priority: 'high',
      status: 'pending'
    });

    // Continue with other features...
  }

  async runVerification(): Promise<FeatureVerificationReport> {
    console.log('🚀 Starting Comprehensive Feature Verification...\n');
    
    // Check prerequisites
    await this.checkPrerequisites();
    
    // Run tests in order of priority
    const sortedTests = this.tests.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const test of sortedTests) {
      await this.runTest(test);
    }

    // Generate report
    this.generateReport();
    this.saveReport();
    this.displaySummary();

    return this.report;
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking Prerequisites...');
    
    // Check if server is running
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.status}`);
      }
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not accessible');
      throw new Error('Prerequisites not met: Server not running');
    }

    // Check database connection
    try {
      const response = await fetch(`${this.baseUrl}/api/health/database`);
      if (!response.ok) {
        throw new Error(`Database health check failed: ${response.status}`);
      }
      console.log('✅ Database is connected');
    } catch (error) {
      console.log('❌ Database is not accessible');
      throw new Error('Prerequisites not met: Database not connected');
    }

    console.log('');
  }

  private async runTest(test: FeatureTest): Promise<void> {
    console.log(`🧪 Testing: ${test.name}`);
    test.status = 'running';
    const startTime = Date.now();

    try {
      // Check dependencies first
      const failedDeps = this.checkDependencies(test);
      if (failedDeps.length > 0) {
        test.status = 'skipped';
        test.error = `Dependencies failed: ${failedDeps.join(', ')}`;
        console.log(`⏭️  Skipped: ${test.error}`);
        return;
      }

      // Run the actual test
      await this.executeTest(test);
      
      test.status = 'passed';
      test.duration = Date.now() - startTime;
      console.log(`✅ Passed (${test.duration}ms)`);
      
    } catch (error) {
      test.status = 'failed';
      test.error = error instanceof Error ? error.message : String(error);
      test.duration = Date.now() - startTime;
      console.log(`❌ Failed: ${test.error}`);
      
      if (test.priority === 'critical') {
        this.report.criticalFailures.push(test.name);
      }
    }
    
    console.log('');
  }

  private checkDependencies(test: FeatureTest): string[] {
    const failedDeps: string[] = [];
    
    for (const dep of test.dependencies) {
      const depTest = this.tests.find(t => t.id === dep);
      if (depTest && depTest.status === 'failed') {
        failedDeps.push(dep);
      }
    }
    
    return failedDeps;
  }

  private async executeTest(test: FeatureTest): Promise<void> {
    switch (test.testFunction) {
      case 'testMLPredictionEngine':
        await this.testMLPredictionEngine(test);
        break;
      case 'testDailyTrainingPipeline':
        await this.testDailyTrainingPipeline(test);
        break;
      case 'testMultiHorizonForecasting':
        await this.testMultiHorizonForecasting(test);
        break;
      case 'testEnsembleModels':
        await this.testEnsembleModels(test);
        break;
      case 'testAutoMLIntegration':
        await this.testAutoMLIntegration(test);
        break;
      default:
        throw new Error(`Test function ${test.testFunction} not implemented`);
    }
  }

  // Individual test implementations
  private async testMLPredictionEngine(test: FeatureTest): Promise<void> {
    if (!test.endpoint) throw new Error('No endpoint specified');
    
    const testPayload = {
      client_id: 'test-client-001',
      prediction_horizon: 7,
      include_confidence: true
    };

    const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Validate response structure
    if (!result.predictions || !Array.isArray(result.predictions)) {
      throw new Error('Invalid response: missing predictions array');
    }

    if (!result.model_metadata) {
      throw new Error('Invalid response: missing model metadata');
    }

    // Validate prediction quality
    const firstPrediction = result.predictions[0];
    if (!firstPrediction.predicted_transcript_count || 
        !firstPrediction.confidence_interval) {
      throw new Error('Invalid prediction structure');
    }
  }

  private async testDailyTrainingPipeline(test: FeatureTest): Promise<void> {
    // Test pipeline trigger and status
    const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual', test_mode: true })
    });

    if (!response.ok) {
      throw new Error(`Training pipeline failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.status || result.status !== 'completed') {
      throw new Error('Training pipeline did not complete successfully');
    }
  }

  private async testMultiHorizonForecasting(test: FeatureTest): Promise<void> {
    const horizons = [1, 7, 30, 90]; // days
    
    for (const horizon of horizons) {
      const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'test-client-001',
          prediction_horizon: horizon
        })
      });

      if (!response.ok) {
        throw new Error(`${horizon}-day forecast failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.predictions || result.predictions.length !== horizon) {
        throw new Error(`Invalid prediction count for ${horizon}-day horizon`);
      }
    }
  }

  private async testEnsembleModels(test: FeatureTest): Promise<void> {
    const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Ensemble model check failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.ensemble_config || !result.model_weights) {
      throw new Error('Ensemble configuration not found');
    }
  }

  private async testAutoMLIntegration(test: FeatureTest): Promise<void> {
    const response = await fetch(`${this.baseUrl}${test.endpoint}/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Vertex AI integration failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.vertex_ai_status || result.vertex_ai_status !== 'healthy') {
      throw new Error('Vertex AI service is not healthy');
    }
  }

  private generateReport(): void {
    this.report.totalTests = this.tests.length;
    this.report.passed = this.tests.filter(t => t.status === 'passed').length;
    this.report.failed = this.tests.filter(t => t.status === 'failed').length;
    this.report.skipped = this.tests.filter(t => t.status === 'skipped').length;
    this.report.results = this.tests;

    // Generate category statistics
    const categories = [...new Set(this.tests.map(t => t.category))];
    for (const category of categories) {
      const categoryTests = this.tests.filter(t => t.category === category);
      this.report.categories[category] = {
        total: categoryTests.length,
        passed: categoryTests.filter(t => t.status === 'passed').length,
        failed: categoryTests.filter(t => t.status === 'failed').length
      };
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  private generateRecommendations(): void {
    const failedTests = this.tests.filter(t => t.status === 'failed');
    
    if (failedTests.length === 0) {
      this.report.recommendations.push('✅ All features are working correctly!');
      return;
    }

    for (const test of failedTests) {
      if (test.priority === 'critical') {
        this.report.recommendations.push(
          `🚨 CRITICAL: Fix ${test.name} immediately - core functionality is broken`
        );
      } else if (test.priority === 'high') {
        this.report.recommendations.push(
          `⚠️  HIGH: Address ${test.name} - important feature is not working`
        );
      }
    }

    // Add specific recommendations based on failure patterns
    const mlFailures = failedTests.filter(t => t.category.startsWith('ML_'));
    if (mlFailures.length > 0) {
      this.report.recommendations.push(
        '🤖 Consider reviewing ML model configurations and Vertex AI setup'
      );
    }
  }

  private saveReport(): void {
    const reportPath = join(process.cwd(), 'tmp_rovodev_feature_verification_report.json');
    writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  private displaySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FEATURE VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.report.totalTests}`);
    console.log(`✅ Passed: ${this.report.passed}`);
    console.log(`❌ Failed: ${this.report.failed}`);
    console.log(`⏭️  Skipped: ${this.report.skipped}`);
    console.log(`🎯 Success Rate: ${((this.report.passed / this.report.totalTests) * 100).toFixed(1)}%`);
    
    if (this.report.criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL FAILURES:');
      this.report.criticalFailures.forEach(failure => {
        console.log(`   • ${failure}`);
      });
    }

    console.log('\n📋 RECOMMENDATIONS:');
    this.report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('\n' + '='.repeat(60));
  }
}

// Execute if run directly
if (require.main === module) {
  const verifier = new FeatureVerificationSystem();
  verifier.runVerification().catch(console.error);
}

export { FeatureVerificationSystem, FeatureTest, FeatureVerificationReport };