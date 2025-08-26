#!/usr/bin/env node

/**
 * Post-Deployment Validation Script
 * Validates that the deployed application is working correctly
 */

const https = require('https');
const http = require('http');

class PostDeploymentValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.PRODUCTION_URL || 'http://localhost:3000';
    this.timeout = options.timeout || parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 30000;
    this.verbose = options.verbose || false;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Post-Deployment-Validator/1.0',
          ...options.headers
        },
        timeout: this.timeout
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });

      const startTime = Date.now();

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  async runTest(name, testFn) {
    this.log(`Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.tests.push({
        name,
        status: 'passed',
        duration,
        result
      });
      
      this.log(`✅ ${name} - PASSED (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.failed++;
      this.results.tests.push({
        name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateBasicConnectivity() {
    await this.runTest('Basic Connectivity', async () => {
      const response = await this.makeRequest('/');
      
      if (response.statusCode !== 200) {
        throw new Error(`Expected status 200, got ${response.statusCode}`);
      }
      
      if (response.responseTime > 5000) {
        this.log(`⚠️ Slow response time: ${response.responseTime}ms`, 'warning');
        this.results.warnings++;
      }
      
      return { responseTime: response.responseTime };
    });
  }

  async validateHealthEndpoint() {
    await this.runTest('Health Endpoint', async () => {
      const response = await this.makeRequest('/api/monitoring/events', { method: 'GET' });
      
      if (response.statusCode !== 200) {
        throw new Error(`Health check failed with status ${response.statusCode}`);
      }
      
      const healthData = JSON.parse(response.body);
      if (healthData.status !== 'healthy') {
        throw new Error(`Health status is ${healthData.status}, expected 'healthy'`);
      }
      
      return healthData;
    });
  }

  async validateAPIEndpoints() {
    const endpoints = [
      { path: '/api/transcripts', expectedStatus: 401, description: 'Transcripts API (should require auth)' },
      { path: '/api/analytics/trends', expectedStatus: 401, description: 'Analytics Trends API (should require auth)' },
      { path: '/api/analytics/predictions', expectedStatus: 401, description: 'Predictions API (should require auth)' }
    ];

    for (const endpoint of endpoints) {
      await this.runTest(`API Endpoint: ${endpoint.description}`, async () => {
        const response = await this.makeRequest(endpoint.path);
        
        if (response.statusCode !== endpoint.expectedStatus) {
          throw new Error(`Expected status ${endpoint.expectedStatus}, got ${response.statusCode}`);
        }
        
        return { statusCode: response.statusCode };
      });
    }
  }

  async validateSecurityHeaders() {
    await this.runTest('Security Headers', async () => {
      const response = await this.makeRequest('/');
      const headers = response.headers;
      
      const requiredHeaders = {
        'strict-transport-security': 'HSTS header',
        'x-content-type-options': 'Content type options header',
        'x-frame-options': 'Frame options header',
        'x-xss-protection': 'XSS protection header',
        'referrer-policy': 'Referrer policy header'
      };
      
      const missingHeaders = [];
      
      for (const [header, description] of Object.entries(requiredHeaders)) {
        if (!headers[header]) {
          missingHeaders.push(description);
        }
      }
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
      }
      
      return { securityHeaders: Object.keys(requiredHeaders).length };
    });
  }

  async validateStaticAssets() {
    await this.runTest('Static Assets', async () => {
      const assets = [
        '/favicon.ico',
        '/_next/static/css',
        '/_next/static/chunks'
      ];
      
      const results = [];
      
      for (const asset of assets) {
        try {
          const response = await this.makeRequest(asset);
          results.push({
            asset,
            status: response.statusCode,
            responseTime: response.responseTime
          });
          
          if (response.statusCode >= 400) {
            this.log(`⚠️ Asset ${asset} returned status ${response.statusCode}`, 'warning');
            this.results.warnings++;
          }
        } catch (error) {
          this.log(`⚠️ Could not validate asset ${asset}: ${error.message}`, 'warning');
          this.results.warnings++;
        }
      }
      
      return results;
    });
  }

  async validatePerformance() {
    await this.runTest('Performance Metrics', async () => {
      const startTime = Date.now();
      const response = await this.makeRequest('/');
      const totalTime = Date.now() - startTime;
      
      const metrics = {
        responseTime: response.responseTime,
        totalTime,
        contentLength: response.headers['content-length'] || 0
      };
      
      // Performance thresholds
      if (totalTime > 3000) {
        throw new Error(`Page load time too slow: ${totalTime}ms (threshold: 3000ms)`);
      }
      
      if (totalTime > 1000) {
        this.log(`⚠️ Slow page load time: ${totalTime}ms`, 'warning');
        this.results.warnings++;
      }
      
      return metrics;
    });
  }

  async validateAuthentication() {
    await this.runTest('Authentication Flow', async () => {
      // Test auth endpoints
      const authResponse = await this.makeRequest('/api/auth/signin');
      
      if (authResponse.statusCode !== 200) {
        throw new Error(`Auth signin page failed with status ${authResponse.statusCode}`);
      }
      
      // Test protected route without auth
      const protectedResponse = await this.makeRequest('/dashboard');
      
      // Should redirect to signin or return 401/403
      if (![200, 302, 401, 403].includes(protectedResponse.statusCode)) {
        throw new Error(`Unexpected response for protected route: ${protectedResponse.statusCode}`);
      }
      
      return {
        signinStatus: authResponse.statusCode,
        protectedRouteStatus: protectedResponse.statusCode
      };
    });
  }

  async validateDatabase() {
    await this.runTest('Database Connectivity', async () => {
      // This would test database connectivity through an API endpoint
      // For now, we'll test if the API endpoints that require DB are responding correctly
      
      const response = await this.makeRequest('/api/transcripts');
      
      // Should return 401 (unauthorized) rather than 500 (server error)
      if (response.statusCode === 500) {
        throw new Error('Database connectivity issue - API returning 500 errors');
      }
      
      return { status: 'accessible' };
    });
  }

  async validateMonitoring() {
    await this.runTest('Monitoring System', async () => {
      // Test monitoring endpoint
      const monitoringData = {
        errors: [],
        performance: [{
          name: 'test_metric',
          value: 100,
          timestamp: new Date().toISOString(),
          url: this.baseUrl,
          sessionId: 'test_session'
        }],
        userEvents: [],
        metadata: {
          sessionId: 'test_session',
          timestamp: new Date().toISOString(),
          environment: 'production',
          userAgent: 'Post-Deployment-Validator/1.0',
          url: this.baseUrl
        }
      };
      
      const response = await this.makeRequest('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(monitoringData)
      });
      
      if (response.statusCode !== 200) {
        throw new Error(`Monitoring endpoint failed with status ${response.statusCode}`);
      }
      
      const result = JSON.parse(response.body);
      if (!result.success) {
        throw new Error('Monitoring endpoint did not return success');
      }
      
      return result;
    });
  }

  async runAllValidations() {
    this.log(`🚀 Starting post-deployment validation for ${this.baseUrl}`);
    
    const validations = [
      () => this.validateBasicConnectivity(),
      () => this.validateHealthEndpoint(),
      () => this.validateAPIEndpoints(),
      () => this.validateSecurityHeaders(),
      () => this.validateStaticAssets(),
      () => this.validatePerformance(),
      () => this.validateAuthentication(),
      () => this.validateDatabase(),
      () => this.validateMonitoring()
    ];
    
    for (const validation of validations) {
      try {
        await validation();
      } catch (error) {
        // Continue with other validations even if one fails
        this.log(`Validation failed but continuing: ${error.message}`, 'warning');
      }
    }
  }

  generateReport() {
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    
    this.log('\n📊 Post-Deployment Validation Report');
    this.log('=' .repeat(50));
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`⚠️ Warnings: ${this.results.warnings}`);
    this.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      this.log('\n🔍 Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach((test, index) => {
          this.log(`${index + 1}. ${test.name}: ${test.error}`);
        });
    }
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: parseFloat(successRate)
      },
      tests: this.results.tests
    };
    
    const fs = require('fs');
    const reportPath = 'post-deployment-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Detailed report saved to: ${reportPath}`);
    
    return this.results.failed === 0;
  }
}

// Run validation if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.baseUrl = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Post-Deployment Validation Usage:
  node scripts/post-deployment-validation.js [options]

Options:
  --url <url>        Base URL to validate (default: from PRODUCTION_URL env var)
  --timeout <ms>     Request timeout in milliseconds (default: 30000)
  --verbose          Show detailed output
  --help             Show this help message

Examples:
  node scripts/post-deployment-validation.js --url https://myapp.vercel.app
  node scripts/post-deployment-validation.js --timeout 60000 --verbose
        `);
        process.exit(0);
    }
  }
  
  const validator = new PostDeploymentValidator(options);
  
  validator.runAllValidations()
    .then(() => {
      const success = validator.generateReport();
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Post-deployment validation failed:', error);
      process.exit(1);
    });
}

module.exports = PostDeploymentValidator;