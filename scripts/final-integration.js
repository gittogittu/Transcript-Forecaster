#!/usr/bin/env node

/**
 * Final Integration Script
 * Completes the final integration and deployment preparation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FinalIntegration {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      steps: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runStep(name, stepFn) {
    this.log(`Running: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await stepFn();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.steps.push({
        name,
        status: 'passed',
        duration,
        result
      });
      
      this.log(`✅ ${name} - COMPLETED (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.failed++;
      this.results.steps.push({
        name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
      return null;
    }
  }

  async validateProjectStructure() {
    await this.runStep('Validate Project Structure', async () => {
      const requiredFiles = [
        'package.json',
        'next.config.ts',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/dashboard/page.tsx',
        'src/app/analytics/page.tsx',
        'src/lib/auth.ts',
        'src/lib/services/google-sheets.ts',
        'src/lib/services/prediction-service.ts',
        '.env.production',
        'scripts/deploy.js',
        'scripts/post-deployment-validation.js'
      ];

      const missingFiles = [];
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }

      return { requiredFiles: requiredFiles.length, missingFiles: 0 };
    });
  }

  async validateEnvironmentConfiguration() {
    await this.runStep('Validate Environment Configuration', async () => {
      const envFile = '.env.production';
      if (!fs.existsSync(envFile)) {
        throw new Error('Production environment file not found');
      }

      const envContent = fs.readFileSync(envFile, 'utf8');
      const requiredVars = [
        'NEXTAUTH_URL',
        'NEXTAUTH_SECRET',
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'GOOGLE_SHEETS_SPREADSHEET_ID'
      ];

      const missingVars = [];
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`)) {
          missingVars.push(varName);
        }
      }

      if (missingVars.length > 0) {
        this.log(`⚠️ Environment variables need configuration: ${missingVars.join(', ')}`, 'warning');
        this.results.warnings++;
      }

      return { 
        requiredVars: requiredVars.length, 
        missingVars: missingVars.length,
        configuredVars: requiredVars.length - missingVars.length
      };
    });
  }

  async validateBuildOutput() {
    await this.runStep('Validate Build Output', async () => {
      if (!fs.existsSync('.next')) {
        throw new Error('Build output directory not found. Run npm run build first.');
      }

      const buildManifest = path.join('.next', 'build-manifest.json');
      if (!fs.existsSync(buildManifest)) {
        throw new Error('Build manifest not found');
      }

      // Check for critical build artifacts
      const criticalFiles = [
        '.next/server/app/page.js',
        '.next/server/app/dashboard/page.js',
        '.next/server/app/analytics/page.js'
      ];

      const missingArtifacts = [];
      for (const file of criticalFiles) {
        if (!fs.existsSync(file)) {
          missingArtifacts.push(file);
        }
      }

      if (missingArtifacts.length > 0) {
        this.log(`⚠️ Some build artifacts missing: ${missingArtifacts.join(', ')}`, 'warning');
        this.results.warnings++;
      }

      return { 
        buildExists: true, 
        manifestExists: true,
        missingArtifacts: missingArtifacts.length
      };
    });
  }

  async validateDeploymentScripts() {
    await this.runStep('Validate Deployment Scripts', async () => {
      const deployScript = 'scripts/deploy.js';
      const validationScript = 'scripts/post-deployment-validation.js';

      if (!fs.existsSync(deployScript)) {
        throw new Error('Deployment script not found');
      }

      if (!fs.existsSync(validationScript)) {
        throw new Error('Post-deployment validation script not found');
      }

      // Check if scripts are executable
      try {
        const deployContent = fs.readFileSync(deployScript, 'utf8');
        const validationContent = fs.readFileSync(validationScript, 'utf8');

        if (!deployContent.includes('class DeploymentManager')) {
          throw new Error('Deployment script appears to be malformed');
        }

        if (!validationContent.includes('class PostDeploymentValidator')) {
          throw new Error('Validation script appears to be malformed');
        }
      } catch (error) {
        throw new Error(`Script validation failed: ${error.message}`);
      }

      return { deployScript: true, validationScript: true };
    });
  }

  async validateCICD() {
    await this.runStep('Validate CI/CD Configuration', async () => {
      const cicdFile = '.github/workflows/ci-cd.yml';
      
      if (!fs.existsSync(cicdFile)) {
        throw new Error('CI/CD workflow file not found');
      }

      const cicdContent = fs.readFileSync(cicdFile, 'utf8');
      
      const requiredJobs = [
        'quality',
        'security',
        'build',
        'e2e',
        'performance',
        'deploy-production'
      ];

      const missingJobs = [];
      for (const job of requiredJobs) {
        if (!cicdContent.includes(`${job}:`)) {
          missingJobs.push(job);
        }
      }

      if (missingJobs.length > 0) {
        throw new Error(`Missing CI/CD jobs: ${missingJobs.join(', ')}`);
      }

      return { 
        workflowExists: true, 
        requiredJobs: requiredJobs.length,
        missingJobs: 0
      };
    });
  }

  async validateMonitoring() {
    await this.runStep('Validate Monitoring Setup', async () => {
      const monitoringFiles = [
        'src/lib/monitoring/production-monitor.ts',
        'src/lib/security/production-security.ts',
        'src/app/api/monitoring/events/route.ts'
      ];

      const missingFiles = [];
      for (const file of monitoringFiles) {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        throw new Error(`Missing monitoring files: ${missingFiles.join(', ')}`);
      }

      return { 
        monitoringFiles: monitoringFiles.length,
        missingFiles: 0
      };
    });
  }

  async validateTestSuite() {
    await this.runStep('Validate Test Suite', async () => {
      const testDirs = [
        'tests/e2e',
        'tests/integration',
        'tests/performance',
        'tests/accessibility'
      ];

      const missingDirs = [];
      for (const dir of testDirs) {
        if (!fs.existsSync(dir)) {
          missingDirs.push(dir);
        }
      }

      if (missingDirs.length > 0) {
        this.log(`⚠️ Some test directories missing: ${missingDirs.join(', ')}`, 'warning');
        this.results.warnings++;
      }

      // Check for critical test files
      const criticalTests = [
        'tests/e2e/complete-workflow.spec.ts',
        'playwright.config.ts',
        'jest.config.js'
      ];

      const missingTests = [];
      for (const test of criticalTests) {
        if (!fs.existsSync(test)) {
          missingTests.push(test);
        }
      }

      if (missingTests.length > 0) {
        throw new Error(`Missing critical test files: ${missingTests.join(', ')}`);
      }

      return { 
        testDirs: testDirs.length - missingDirs.length,
        criticalTests: criticalTests.length
      };
    });
  }

  async createDeploymentReadiness() {
    return await this.runStep('Create Deployment Readiness Report', async () => {
      const readinessReport = {
        timestamp: new Date().toISOString(),
        version: this.getPackageVersion(),
        environment: 'production',
        readiness: {
          structure: this.results.steps.find(s => s.name === 'Validate Project Structure')?.status === 'passed',
          environment: this.results.steps.find(s => s.name === 'Validate Environment Configuration')?.status === 'passed',
          build: this.results.steps.find(s => s.name === 'Validate Build Output')?.status === 'passed',
          deployment: this.results.steps.find(s => s.name === 'Validate Deployment Scripts')?.status === 'passed',
          cicd: this.results.steps.find(s => s.name === 'Validate CI/CD Configuration')?.status === 'passed',
          monitoring: this.results.steps.find(s => s.name === 'Validate Monitoring Setup')?.status === 'passed',
          testing: this.results.steps.find(s => s.name === 'Validate Test Suite')?.status === 'passed'
        },
        summary: {
          totalSteps: this.results.passed + this.results.failed,
          passedSteps: this.results.passed,
          failedSteps: this.results.failed,
          warnings: this.results.warnings,
          overallReadiness: this.results.failed === 0 ? 'READY' : 'NOT_READY'
        },
        nextSteps: this.generateNextSteps()
      };

      const reportPath = 'deployment-readiness-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(readinessReport, null, 2));
      
      this.log(`📄 Deployment readiness report saved to: ${reportPath}`);
      
      return readinessReport;
    });
  }

  getPackageVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  generateNextSteps() {
    const nextSteps = [];
    
    if (this.results.failed > 0) {
      nextSteps.push('Fix failed validation steps before deployment');
    }
    
    if (this.results.warnings > 0) {
      nextSteps.push('Review and address warning items');
    }
    
    nextSteps.push('Configure production environment variables in .env.production.local');
    nextSteps.push('Set up deployment secrets in your CI/CD platform');
    nextSteps.push('Run deployment script: node scripts/deploy.js');
    nextSteps.push('Monitor deployment with: node scripts/post-deployment-validation.js');
    
    return nextSteps;
  }

  async runFinalIntegration() {
    try {
      this.log('🚀 Starting Final Integration and Deployment Preparation...');

      // Run all validation steps
      await this.validateProjectStructure();
      await this.validateEnvironmentConfiguration();
      await this.validateBuildOutput();
      await this.validateDeploymentScripts();
      await this.validateCICD();
      await this.validateMonitoring();
      await this.validateTestSuite();
      
      // Create deployment readiness report
      const readinessReport = await this.createDeploymentReadiness();

      // Generate final summary
      if (readinessReport) {
        this.generateFinalSummary(readinessReport);
        return readinessReport.summary.overallReadiness === 'READY';
      }
      
      return false;

    } catch (error) {
      this.log(`💥 Final integration failed: ${error.message}`, 'error');
      return false;
    }
  }

  generateFinalSummary(readinessReport) {
    this.log('\n🎯 Final Integration Summary');
    this.log('=' .repeat(50));
    this.log(`✅ Passed Steps: ${this.results.passed}`);
    this.log(`❌ Failed Steps: ${this.results.failed}`);
    this.log(`⚠️ Warnings: ${this.results.warnings}`);
    this.log(`📊 Overall Readiness: ${readinessReport.summary.overallReadiness}`);

    if (readinessReport.summary.overallReadiness === 'READY') {
      this.log('\n🎉 APPLICATION IS READY FOR DEPLOYMENT!', 'success');
      this.log('\nNext Steps:');
      readinessReport.nextSteps.forEach((step, index) => {
        this.log(`${index + 1}. ${step}`);
      });
    } else {
      this.log('\n⚠️ APPLICATION NEEDS ATTENTION BEFORE DEPLOYMENT', 'warning');
      this.log('\nFailed Steps:');
      this.results.steps
        .filter(step => step.status === 'failed')
        .forEach((step, index) => {
          this.log(`${index + 1}. ${step.name}: ${step.error}`);
        });
    }

    this.log('\n📋 Deployment Checklist:');
    this.log(`${readinessReport.readiness.structure ? '✅' : '❌'} Project Structure`);
    this.log(`${readinessReport.readiness.environment ? '✅' : '❌'} Environment Configuration`);
    this.log(`${readinessReport.readiness.build ? '✅' : '❌'} Build Output`);
    this.log(`${readinessReport.readiness.deployment ? '✅' : '❌'} Deployment Scripts`);
    this.log(`${readinessReport.readiness.cicd ? '✅' : '❌'} CI/CD Pipeline`);
    this.log(`${readinessReport.readiness.monitoring ? '✅' : '❌'} Monitoring Setup`);
    this.log(`${readinessReport.readiness.testing ? '✅' : '❌'} Test Suite`);
  }
}

// Run final integration if called directly
if (require.main === module) {
  const integration = new FinalIntegration();
  
  integration.runFinalIntegration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Final integration script failed:', error);
      process.exit(1);
    });
}

module.exports = FinalIntegration;