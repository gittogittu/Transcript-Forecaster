#!/usr/bin/env node

/**
 * Integration Test Runner
 * Runs complete user workflow tests to validate all components work together
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description) {
    this.log(`Running: ${description}`);
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.log(`✅ ${description} - PASSED`, 'success');
      this.testResults.passed++;
      return { success: true, output };
    } catch (error) {
      this.log(`❌ ${description} - FAILED: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push({
        test: description,
        error: error.message,
        command
      });
      return { success: false, error: error.message };
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating environment setup...');
    
    // Check required files exist
    const requiredFiles = [
      'package.json',
      'next.config.ts',
      'tsconfig.json',
      '.env.example',
      'src/app/layout.tsx',
      'src/lib/auth.ts'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Check environment variables
    const envExample = fs.readFileSync('.env.example', 'utf8');
    const requiredEnvVars = envExample.match(/^[A-Z_]+=.*/gm) || [];
    
    this.log(`Found ${requiredEnvVars.length} required environment variables`);
    
    return true;
  }

  async runIntegrationTests() {
    this.log('🚀 Starting comprehensive integration tests...');

    try {
      // 1. Environment validation
      await this.validateEnvironment();

      // 2. Type checking
      await this.runCommand('npm run type-check', 'TypeScript type checking');

      // 3. Linting
      await this.runCommand('npm run lint', 'ESLint code quality check');

      // 4. Unit tests
      await this.runCommand('npm run test -- --passWithNoTests', 'Unit tests');

      // 5. Integration tests
      await this.runCommand('npm run test:integration -- --passWithNoTests', 'Integration tests');

      // 6. Accessibility tests
      await this.runCommand('npm run test:accessibility -- --passWithNoTests', 'Accessibility tests');

      // 7. Performance tests
      await this.runCommand('npm run test:performance -- --passWithNoTests', 'Performance tests');

      // 8. Build test
      await this.runCommand('npm run build', 'Production build');

      // 9. E2E tests (if build successful)
      if (this.testResults.failed === 0) {
        // Start the application in background for E2E tests
        this.log('Starting application for E2E tests...');
        const { spawn } = require('child_process');
        
        const server = spawn('npm', ['start'], {
          stdio: 'pipe',
          detached: false
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        try {
          await this.runCommand('npm run test:e2e', 'End-to-end tests');
        } finally {
          // Clean up server
          server.kill();
        }
      }

      // 10. Bundle analysis
      await this.runCommand('ANALYZE=true npm run build', 'Bundle analysis');

    } catch (error) {
      this.log(`Integration test setup failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'Environment Setup',
        error: error.message
      });
    }
  }

  generateReport() {
    this.log('\n📊 Integration Test Report');
    this.log('=' .repeat(50));
    this.log(`✅ Passed: ${this.testResults.passed}`);
    this.log(`❌ Failed: ${this.testResults.failed}`);
    this.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.errors.length > 0) {
      this.log('\n🔍 Failed Tests:');
      this.testResults.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.test}`);
        this.log(`   Command: ${error.command || 'N/A'}`);
        this.log(`   Error: ${error.error}`);
        this.log('');
      });
    }

    // Write detailed report to file
    const reportPath = path.join(process.cwd(), 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)
      }
    }, null, 2));

    this.log(`📄 Detailed report saved to: ${reportPath}`);

    return this.testResults.failed === 0;
  }
}

// Run integration tests if called directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  
  runner.runIntegrationTests()
    .then(() => {
      const success = runner.generateReport();
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Integration test runner failed:', error);
      process.exit(1);
    });
}

module.exports = IntegrationTestRunner;