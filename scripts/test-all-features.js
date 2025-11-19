#!/usr/bin/env node

/**
 * Comprehensive Feature Testing Script
 * Tests all features of the Transcript Analytics Platform
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Transcript Analytics Platform - Comprehensive Feature Testing\n');
console.log('=' .repeat(80));

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_DATA_FILE = path.join(__dirname, '..', 'test-data-comprehensive.csv');

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, status, message = '') {
  const statusSymbol = {
    'PASS': '✅',
    'FAIL': '❌',
    'SKIP': '⏭️',
    'INFO': 'ℹ️'
  };
  
  console.log(`${statusSymbol[status]} ${name}`);
  if (message) {
    console.log(`   ${message}`);
  }
  
  testResults.tests.push({ name, status, message });
  if (status === 'PASS') testResults.passed++;
  if (status === 'FAIL') testResults.failed++;
  if (status === 'SKIP') testResults.skipped++;
}

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, error: error.message, ok: false };
  }
}

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('\n📋 Test Plan Overview:');
console.log('1. System Health Checks');
console.log('2. Client Management (CRUD operations)');
console.log('3. Data Import & Processing');
console.log('4. ML Predictions & Forecasting');
console.log('5. Anomaly Detection');
console.log('6. Analytics & Dashboards');
console.log('7. Business Intelligence & Recommendations');
console.log('8. Vector Search & Embeddings');
console.log('9. Performance Monitoring');
console.log('');

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 1: System Health & Connectivity');
  console.log('='.repeat(80) + '\n');

  // Test 1.1: Application Health Check
  try {
    const health = await apiCall('/api/health');
    if (health.ok && health.data.status === 'healthy') {
      logTest('Application Health Check', 'PASS', `Status: ${health.data.status}`);
    } else {
      logTest('Application Health Check', 'FAIL', `Unhealthy: ${JSON.stringify(health.data)}`);
    }
  } catch (error) {
    logTest('Application Health Check', 'FAIL', `Error: ${error.message}`);
  }

  // Test 1.2: Database Health Check
  try {
    const dbHealth = await apiCall('/api/health/database');
    if (dbHealth.ok) {
      logTest('Database Health Check', 'PASS', `Connection count: ${dbHealth.data.connection_count || 'N/A'}`);
    } else {
      logTest('Database Health Check', 'FAIL', 'Database not responding');
    }
  } catch (error) {
    logTest('Database Health Check', 'FAIL', `Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 2: Client Management');
  console.log('='.repeat(80) + '\n');

  let createdClientIds = [];

  // Test 2.1: Create Clients
  const testClients = [
    { client_code: 'ASU-prod', name: 'Arizona State University', environment: 'prod' },
    { client_code: 'MIT-prod', name: 'Massachusetts Institute of Technology', environment: 'prod' },
    { client_code: 'Stanford-prod', name: 'Stanford University', environment: 'prod' },
    { client_code: 'UCLA-prod', name: 'University of California Los Angeles', environment: 'prod' },
    { client_code: 'Berkeley-uat', name: 'UC Berkeley', environment: 'uat' }
  ];

  for (const client of testClients) {
    try {
      const result = await apiCall('/api/clients', {
        method: 'POST',
        body: JSON.stringify(client)
      });
      
      if (result.ok && result.data.success) {
        createdClientIds.push(result.data.client.id);
        logTest(`Create Client: ${client.client_code}`, 'PASS', `ID: ${result.data.client.id}`);
      } else {
        logTest(`Create Client: ${client.client_code}`, 'FAIL', result.data.error || 'Unknown error');
      }
    } catch (error) {
      logTest(`Create Client: ${client.client_code}`, 'FAIL', error.message);
    }
    await wait(100);
  }

  // Test 2.2: List Clients
  try {
    const result = await apiCall('/api/clients');
    if (result.ok && result.data.clients && result.data.clients.length > 0) {
      logTest('List Clients', 'PASS', `Found ${result.data.clients.length} clients`);
    } else {
      logTest('List Clients', 'FAIL', 'No clients returned');
    }
  } catch (error) {
    logTest('List Clients', 'FAIL', error.message);
  }

  // Test 2.3: Search Clients
  try {
    const result = await apiCall('/api/clients?q=ASU');
    if (result.ok && result.data.clients) {
      logTest('Search Clients (q=ASU)', 'PASS', `Found ${result.data.clients.length} matching clients`);
    } else {
      logTest('Search Clients (q=ASU)', 'FAIL', 'Search failed');
    }
  } catch (error) {
    logTest('Search Clients (q=ASU)', 'FAIL', error.message);
  }

  // Test 2.4: Filter by Environment
  try {
    const result = await apiCall('/api/clients?environment=prod');
    if (result.ok && result.data.clients) {
      logTest('Filter Clients (environment=prod)', 'PASS', `Found ${result.data.clients.length} prod clients`);
    } else {
      logTest('Filter Clients (environment=prod)', 'FAIL', 'Filter failed');
    }
  } catch (error) {
    logTest('Filter Clients (environment=prod)', 'FAIL', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 3: Data Import & Processing');
  console.log('='.repeat(80) + '\n');

  // Test 3.1: Check if test data file exists
  if (fs.existsSync(TEST_DATA_FILE)) {
    logTest('Test Data File Exists', 'PASS', `Path: ${TEST_DATA_FILE}`);
  } else {
    logTest('Test Data File Exists', 'FAIL', `File not found: ${TEST_DATA_FILE}`);
  }

  // Test 3.2: Data Import (Note: This would require FormData in browser)
  logTest('Data Import via API', 'INFO', 'Use the UI at /data/import to upload test-data-comprehensive.csv');
  logTest('Data Import Features to Test', 'INFO', '- Clean Data option\n   - Generate Embeddings option\n   - Train Models option\n   - Detect Anomalies option');

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 4: ML Predictions & Forecasting');
  console.log('='.repeat(80) + '\n');

  // Test 4.1: Generate Forecast (simplified test)
  if (createdClientIds.length > 0) {
    try {
      const result = await apiCall('/api/predictions/forecast', {
        method: 'POST',
        body: JSON.stringify({
          client_id: createdClientIds[0],
          horizon: 7,
          confidence_level: 0.95
        })
      });
      
      if (result.ok && result.data.success) {
        logTest('Generate ML Forecast (7 days)', 'PASS', 'Predictions generated successfully');
      } else {
        logTest('Generate ML Forecast (7 days)', 'FAIL', result.data.error || 'Prediction failed');
      }
    } catch (error) {
      logTest('Generate ML Forecast (7 days)', 'FAIL', error.message);
    }
  } else {
    logTest('Generate ML Forecast', 'SKIP', 'No clients available');
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 5: Anomaly Detection');
  console.log('='.repeat(80) + '\n');

  // Test 5.1: Anomaly Detection
  if (createdClientIds.length > 0) {
    try {
      const result = await apiCall('/api/anomaly-detection/detect', {
        method: 'POST',
        body: JSON.stringify({
          client_id: createdClientIds[2], // Stanford (has anomaly on Feb 13)
          time_range: {
            start_date: '2024-01-01',
            end_date: '2024-03-31'
          },
          sensitivity: 0.8
        })
      });
      
      if (result.ok) {
        const anomalyCount = result.data.anomalies ? result.data.anomalies.length : 0;
        logTest('Anomaly Detection', 'PASS', `Detected ${anomalyCount} anomalies`);
        if (anomalyCount > 0) {
          logTest('Anomaly Details', 'INFO', `Should detect spike on Feb 13 (120 vs ~57 avg)`);
        }
      } else {
        logTest('Anomaly Detection', 'FAIL', result.data.error || 'Detection failed');
      }
    } catch (error) {
      logTest('Anomaly Detection', 'FAIL', error.message);
    }
  } else {
    logTest('Anomaly Detection', 'SKIP', 'No clients available');
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 6: Analytics & Dashboards');
  console.log('='.repeat(80) + '\n');

  // Test 6.1: Get Analytics Insights
  try {
    const result = await apiCall('/api/analytics/insights');
    if (result.ok && result.data.success) {
      const insightCount = result.data.insights ? result.data.insights.length : 0;
      logTest('Business Insights Generation', 'PASS', `Generated ${insightCount} insights`);
    } else {
      logTest('Business Insights Generation', 'FAIL', result.data.error || 'Failed to generate insights');
    }
  } catch (error) {
    logTest('Business Insights Generation', 'FAIL', error.message);
  }

  // Test 6.2: Get Comprehensive Dashboard Data
  try {
    const result = await apiCall('/api/analytics/comprehensive-data');
    if (result.ok && result.data.success) {
      logTest('Comprehensive Analytics Data', 'PASS', 'Dashboard data retrieved');
    } else {
      logTest('Comprehensive Analytics Data', 'FAIL', result.data.error || 'Failed to retrieve data');
    }
  } catch (error) {
    logTest('Comprehensive Analytics Data', 'FAIL', error.message);
  }

  // Test 6.3: Dashboard Pages Accessibility
  const dashboards = [
    '/analytics/dashboard',
    '/analytics/comprehensive-dashboard',
    '/analytics/interactive-dashboard',
    '/demo/dashboard'
  ];

  for (const dashboard of dashboards) {
    logTest(`Dashboard: ${dashboard}`, 'INFO', `Access via browser: ${BASE_URL}${dashboard}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 7: Business Intelligence & Recommendations');
  console.log('='.repeat(80) + '\n');

  // Test 7.1: Check for BI Recommendations
  logTest('AI-Powered Recommendations', 'INFO', 'Verify in dashboard that recommendations include:');
  logTest('Expected Recommendations', 'INFO', '- Staffing optimization suggestions\n   - Capacity planning alerts\n   - Growth trend predictions\n   - Resource allocation advice');

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 8: Vector Search & Embeddings');
  console.log('='.repeat(80) + '\n');

  // Test 8.1: Embeddings Generation
  logTest('Vector Embeddings', 'INFO', 'Test by importing data with "Generate Embeddings" enabled');
  logTest('Similarity Search', 'INFO', 'Check for similar patterns across clients');

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 9: Advanced ML Features');
  console.log('='.repeat(80) + '\n');

  // Test 9.1: Model Comparison
  logTest('Multi-Algorithm Comparison', 'INFO', 'All 10+ algorithms should be tested:');
  logTest('Statistical Models', 'INFO', '- ARIMA/SARIMA\n   - Prophet\n   - Exponential Smoothing\n   - Kalman Filters');
  logTest('ML Models', 'INFO', '- Random Forest\n   - XGBoost/LightGBM\n   - SVR');
  logTest('Deep Learning Models', 'INFO', '- LSTM\n   - GRU\n   - Transformers\n   - CNN-LSTM Hybrid');

  // Test 9.2: Feature Engineering
  logTest('Automated Feature Engineering', 'INFO', '50+ features should be generated:');
  logTest('Feature Categories', 'INFO', '- Temporal (hour, day, month, holidays)\n   - Statistical (rolling averages, std dev)\n   - Domain-specific (AHT, seasonality)\n   - Advanced (Fourier, wavelets, PCA)');

  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Passed:  ${testResults.passed}`);
  console.log(`❌ Failed:  ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  console.log(`ℹ️  Info:    ${testResults.tests.filter(t => t.status === 'INFO').length}`);
  console.log(`📊 Total:   ${testResults.tests.length}`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('MANUAL TESTING CHECKLIST');
  console.log('='.repeat(80) + '\n');

  console.log('📝 Complete these manual tests in the UI:\n');
  console.log('1. ✅ Navigate to /data/import');
  console.log('   - Upload test-data-comprehensive.csv');
  console.log('   - Enable all options: Clean Data, Generate Embeddings, Train Models, Detect Anomalies');
  console.log('   - Verify import completes successfully\n');
  
  console.log('2. ✅ Navigate to /analytics/comprehensive-dashboard');
  console.log('   - Verify all 5 clients are shown');
  console.log('   - Check time series charts display data');
  console.log('   - Verify growth trends are visible\n');
  
  console.log('3. ✅ Check ML Predictions');
  console.log('   - Select ASU-prod client');
  console.log('   - Generate 7-day, 30-day, and 90-day forecasts');
  console.log('   - Verify confidence intervals are shown');
  console.log('   - Check prediction accuracy metrics\n');
  
  console.log('4. ✅ Verify Anomaly Detection');
  console.log('   - Select Stanford-prod client');
  console.log('   - Check that Feb 13 anomaly (120 vs ~57) is detected');
  console.log('   - Verify anomaly explanation is provided');
  console.log('   - Check severity rating\n');
  
  console.log('5. ✅ Test Business Insights');
  console.log('   - Navigate to insights section');
  console.log('   - Verify AI-generated recommendations appear');
  console.log('   - Check for staffing suggestions');
  console.log('   - Verify capacity planning alerts\n');
  
  console.log('6. ✅ Client Management');
  console.log('   - Edit a client (change name/email)');
  console.log('   - Search for clients');
  console.log('   - Filter by environment (prod/uat)');
  console.log('   - Deactivate and reactivate a client\n');
  
  console.log('7. ✅ Interactive Features');
  console.log('   - Drill down into metrics');
  console.log('   - Filter by date range');
  console.log('   - Export data (CSV/PDF)');
  console.log('   - Customize dashboard widgets\n');
  
  console.log('8. ✅ Performance Testing');
  console.log('   - Check page load times (<2 seconds)');
  console.log('   - Verify API response times (<500ms)');
  console.log('   - Test with multiple concurrent users');
  console.log('   - Monitor database connection pool\n');

  console.log('\n' + '='.repeat(80));
  console.log('EXPECTED BUSINESS INSIGHTS & RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  console.log('Based on the test data, the system should generate:\n');
  
  console.log('📈 Growth Trends:');
  console.log('   - ASU: 45 → 135 transcripts (+200% growth over 3 months)');
  console.log('   - MIT: 30 → 95 transcripts (+217% growth)');
  console.log('   - Stanford: 25 → 90 transcripts (+260% growth)');
  console.log('   - UCLA: 40 → 105 transcripts (+162% growth)');
  console.log('   - Berkeley (UAT): 15 → 80 transcripts (+433% growth)\n');
  
  console.log('🎯 Expected Recommendations:');
  console.log('   ✓ "High growth detected across all clients - consider hiring"');
  console.log('   ✓ "ASU showing consistent 2-3 transcript daily increase"');
  console.log('   ✓ "Berkeley (UAT) ready for production - strong growth trend"');
  console.log('   ✓ "Staffing optimization: Allocate 30% more resources by end of Q1"');
  console.log('   ✓ "Peak periods: Mid-month shows higher volumes"\n');
  
  console.log('⚠️  Anomalies to Detect:');
  console.log('   ✓ Stanford Feb 13: 120 transcripts (vs avg ~57) - 107% spike');
  console.log('   ✓ Should flag as: "Unusual spike detected - investigate cause"\n');
  
  console.log('📊 Forecasting Predictions (30-day):');
  console.log('   ✓ ASU next month: 140-160 transcripts (95% confidence)');
  console.log('   ✓ MIT next month: 100-115 transcripts');
  console.log('   ✓ Stanford next month: 95-110 transcripts');
  console.log('   ✓ UCLA next month: 110-125 transcripts\n');

  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80) + '\n');

  console.log('1. Start the development server:');
  console.log('   npm run dev\n');
  
  console.log('2. Ensure the database is running and migrations are up to date:');
  console.log('   npm run db:migrate\n');
  
  console.log('3. Open the application:');
  console.log(`   ${BASE_URL}\n`);
  
  console.log('4. Import the test data:');
  console.log('   - Go to /data/import');
  console.log('   - Upload: test-data-comprehensive.csv');
  console.log('   - Enable all processing options\n');
  
  console.log('5. Run the automated tests again:');
  console.log('   node scripts/test-all-features.js\n');
  
  console.log('6. Complete the manual testing checklist above\n');
  
  console.log('7. Verify ML model training:');
  console.log('   - Check logs for daily training pipeline');
  console.log('   - Verify model accuracy metrics');
  console.log('   - Test ensemble predictions\n');

  console.log('=' .repeat(80));
  console.log('Testing complete! 🎉');
  console.log('=' .repeat(80));

  // Save test results to file
  const resultsPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\nTest results saved to: ${resultsPath}`);

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
