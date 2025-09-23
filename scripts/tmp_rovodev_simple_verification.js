#!/usr/bin/env node

/**
 * Simple Feature Verification - Tests actual API endpoints
 * This version works immediately without TypeScript compilation issues
 */

const fs = require('fs');
const path = require('path');

class SimpleFeatureVerification {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runVerification() {
    console.log('🚀 Starting Simple Feature Verification...\n');
    console.log('🔍 Testing API endpoints from your Transcript Analytics Platform\n');

    // Define core tests to run
    const tests = [
      {
        name: 'Server Health Check',
        endpoint: '/api/health',
        method: 'GET',
        priority: 'critical'
      },
      {
        name: 'Database Health',
        endpoint: '/api/health/database',
        method: 'GET',
        priority: 'critical'
      },
      {
        name: 'System Health',
        endpoint: '/api/system/health',
        method: 'GET',
        priority: 'high'
      },
      {
        name: 'ML Prediction Engine',
        endpoint: '/api/predictions/simple',
        method: 'POST',
        priority: 'critical',
        payload: {
          client_id: 'test-client',
          prediction_horizon: 7,
          include_confidence: true
        }
      },
      {
        name: 'Client Management',
        endpoint: '/api/clients',
        method: 'GET',
        priority: 'high'
      },
      {
        name: 'Analytics Dashboard Stats',
        endpoint: '/api/analytics/dashboard/stats',
        method: 'GET',
        priority: 'high'
      },
      {
        name: 'Vertex AI Health',
        endpoint: '/api/vertex-ai/health',
        method: 'GET',
        priority: 'medium'
      },
      {
        name: 'Anomaly Detection Config',
        endpoint: '/api/anomaly-detection/config',
        method: 'GET',
        priority: 'medium'
      },
      {
        name: 'Performance Monitoring',
        endpoint: '/api/performance-monitoring/health',
        method: 'GET',
        priority: 'medium'
      },
      {
        name: 'Embeddings Stats',
        endpoint: '/api/embeddings/stats',
        method: 'GET',
        priority: 'medium'
      }
    ];

    // Check if server is accessible first
    const serverAccessible = await this.checkServerAccessibility();
    if (!serverAccessible) {
      console.log('❌ Server is not accessible at', this.baseUrl);
      console.log('💡 Make sure to start your development server with: npm run dev\n');
      return this.generateOfflineReport();
    }

    console.log('✅ Server is accessible, running endpoint tests...\n');

    // Run each test
    for (const test of tests) {
      await this.runTest(test);
    }

    return this.generateReport();
  }

  async checkServerAccessibility() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.baseUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async runTest(test) {
    console.log(`🧪 Testing: ${test.name}`);
    const startTime = Date.now();
    
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (test.payload && test.method === 'POST') {
        options.body = JSON.stringify(test.payload);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      options.signal = controller.signal;

      const response = await fetch(`${this.baseUrl}${test.endpoint}`, options);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const result = {
        name: test.name,
        endpoint: test.endpoint,
        method: test.method,
        priority: test.priority,
        status: response.ok ? 'passed' : 'failed',
        statusCode: response.status,
        duration: duration,
        error: response.ok ? null : `HTTP ${response.status} ${response.statusText}`
      };

      this.testResults.push(result);

      if (response.ok) {
        console.log(`   ✅ PASSED (${duration}ms) - HTTP ${response.status}`);
      } else {
        console.log(`   ❌ FAILED (${duration}ms) - HTTP ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        name: test.name,
        endpoint: test.endpoint,
        method: test.method,
        priority: test.priority,
        status: 'failed',
        statusCode: 0,
        duration: duration,
        error: error.message.includes('abort') ? 'Timeout (10s)' : error.message
      };

      this.testResults.push(result);
      console.log(`   ❌ FAILED (${duration}ms) - ${result.error}`);
    }

    console.log('');
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    const criticalFailures = this.testResults.filter(r => 
      r.status === 'failed' && r.priority === 'critical'
    );

    console.log('=' + '='.repeat(60));
    console.log('📊 FEATURE VERIFICATION RESULTS');
    console.log('=' + '='.repeat(60));
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📋 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL FAILURES:');
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.name}: ${failure.error}`);
      });
    }

    // Show working features
    const workingFeatures = this.testResults.filter(r => r.status === 'passed');
    if (workingFeatures.length > 0) {
      console.log('\n✅ WORKING FEATURES:');
      workingFeatures.forEach(feature => {
        console.log(`   • ${feature.name} (${feature.duration}ms)`);
      });
    }

    // Show failed features
    const failedFeatures = this.testResults.filter(r => r.status === 'failed');
    if (failedFeatures.length > 0) {
      console.log('\n❌ FAILED FEATURES:');
      failedFeatures.forEach(feature => {
        console.log(`   • ${feature.name}: ${feature.error}`);
      });
    }

    console.log('\n📋 RECOMMENDATIONS:');
    if (failed === 0) {
      console.log('   🎉 Excellent! All tested features are working correctly!');
      console.log('   📈 Your Transcript Analytics Platform is fully operational');
    } else {
      if (criticalFailures.length > 0) {
        console.log('   🚨 URGENT: Fix critical failures (health checks, ML engine)');
      }
      console.log(`   🔧 Review and fix ${failed} failed endpoint(s)`);
      console.log('   📋 Check server logs for detailed error information');
      console.log('   🔄 Re-run verification after fixes');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      server_url: this.baseUrl,
      total_duration_ms: totalDuration,
      summary: {
        total: total,
        passed: passed,
        failed: failed,
        success_rate: ((passed / total) * 100).toFixed(1) + '%'
      },
      critical_failures: criticalFailures.map(f => f.name),
      results: this.testResults,
      recommendations: this.generateRecommendations(passed, failed, criticalFailures)
    };

    const reportPath = 'tmp_rovodev_verification_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('=' + '='.repeat(60));

    return report;
  }

  generateOfflineReport() {
    console.log('=' + '='.repeat(60));
    console.log('📊 OFFLINE VERIFICATION REPORT');
    console.log('=' + '='.repeat(60));
    console.log('🔌 Server Status: NOT ACCESSIBLE');
    console.log(`🌐 Tested URL: ${this.baseUrl}`);
    console.log('\n💡 TO RUN FULL VERIFICATION:');
    console.log('   1. Start your development server:');
    console.log('      npm run dev');
    console.log('   2. Ensure it\'s running on http://localhost:3000');
    console.log('   3. Re-run this verification:');
    console.log('      node scripts/tmp_rovodev_simple_verification.js');
    console.log('\n📋 ALTERNATIVE: Run demo verification (works offline):');
    console.log('      node scripts/tmp_rovodev_demo_verification.js');
    console.log('=' + '='.repeat(60));

    return { status: 'offline', server_accessible: false };
  }

  generateRecommendations(passed, failed, criticalFailures) {
    const recommendations = [];
    
    if (failed === 0) {
      recommendations.push('All features are working correctly!');
      recommendations.push('Consider running daily verification to maintain quality');
      recommendations.push('Set up automated monitoring for production');
    } else {
      if (criticalFailures.length > 0) {
        recommendations.push('CRITICAL: Fix health check and ML prediction engine issues immediately');
      }
      recommendations.push(`Fix ${failed} failed API endpoint(s)`);
      recommendations.push('Check server logs for detailed error messages');
      recommendations.push('Verify database connectivity and schema');
      recommendations.push('Ensure all environment variables are properly configured');
    }
    
    return recommendations;
  }
}

// Run if executed directly
if (require.main === module) {
  const verifier = new SimpleFeatureVerification();
  verifier.runVerification()
    .then(report => {
      process.exit(report.status === 'offline' ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { SimpleFeatureVerification };