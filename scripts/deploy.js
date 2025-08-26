#!/usr/bin/env node

/**
 * Deployment Script
 * Handles production deployment with pre-deployment checks and post-deployment validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.skipTests = options.skipTests || false;
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description, options = {}) {
    this.log(`${this.dryRun ? '[DRY RUN] ' : ''}Running: ${description}`);
    
    if (this.dryRun) {
      this.log(`Would execute: ${command}`);
      return { success: true, output: 'DRY RUN - Command not executed' };
    }

    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: this.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd(),
        ...options
      });
      this.log(`✅ ${description} - COMPLETED`, 'success');
      return { success: true, output };
    } catch (error) {
      this.log(`❌ ${description} - FAILED: ${error.message}`, 'error');
      if (!options.continueOnError) {
        throw error;
      }
      return { success: false, error: error.message };
    }
  }

  async validatePreDeployment() {
    this.log('🔍 Running pre-deployment validation...');

    // Check environment file exists
    const envFile = `.env.${this.environment}`;
    if (!fs.existsSync(envFile)) {
      throw new Error(`Environment file ${envFile} not found`);
    }

    // Validate required environment variables
    const envContent = fs.readFileSync(envFile, 'utf8');
    const requiredVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_SPREADSHEET_ID'
    ];

    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`)) {
        throw new Error(`Environment variable ${varName} is not properly configured`);
      }
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Minimum version: 18.x`);
    }

    this.log('✅ Pre-deployment validation passed', 'success');
  }

  async runTests() {
    if (this.skipTests) {
      this.log('⏭️ Skipping tests as requested', 'warning');
      return;
    }

    this.log('🧪 Running test suite...');

    // Run integration tests
    await this.runCommand('node scripts/integration-test.js', 'Integration test suite');
    
    this.log('✅ All tests passed', 'success');
  }

  async buildApplication() {
    this.log('🏗️ Building application for production...');

    // Clean previous build
    await this.runCommand('rm -rf .next', 'Clean previous build', { continueOnError: true });

    // Set environment
    process.env.NODE_ENV = this.environment;

    // Build application
    await this.runCommand('npm run build', 'Build Next.js application');

    // Verify build output
    if (!fs.existsSync('.next')) {
      throw new Error('Build output directory .next not found');
    }

    const buildManifest = path.join('.next', 'build-manifest.json');
    if (!fs.existsSync(buildManifest)) {
      throw new Error('Build manifest not found - build may have failed');
    }

    this.log('✅ Application built successfully', 'success');
  }

  async optimizeAssets() {
    this.log('⚡ Optimizing assets...');

    // Generate bundle analysis report
    await this.runCommand('ANALYZE=true npm run build', 'Generate bundle analysis', { continueOnError: true });

    // Check bundle sizes
    const nextDir = '.next';
    const staticDir = path.join(nextDir, 'static');
    
    if (fs.existsSync(staticDir)) {
      const bundleStats = this.analyzeBundleSize(staticDir);
      this.log(`📊 Bundle analysis: ${bundleStats.totalSize}MB total, ${bundleStats.jsSize}MB JavaScript`);
      
      if (bundleStats.jsSize > 5) {
        this.log('⚠️ JavaScript bundle size is large (>5MB). Consider code splitting.', 'warning');
      }
    }

    this.log('✅ Asset optimization completed', 'success');
  }

  analyzeBundleSize(dir) {
    let totalSize = 0;
    let jsSize = 0;

    const files = fs.readdirSync(dir, { recursive: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isFile()) {
        const size = fs.statSync(filePath).size / (1024 * 1024); // MB
        totalSize += size;
        
        if (file.endsWith('.js')) {
          jsSize += size;
        }
      }
    }

    return {
      totalSize: totalSize.toFixed(2),
      jsSize: jsSize.toFixed(2)
    };
  }

  async deployToVercel() {
    this.log('🚀 Deploying to Vercel...');

    // Check if Vercel CLI is installed
    try {
      await this.runCommand('vercel --version', 'Check Vercel CLI');
    } catch (error) {
      throw new Error('Vercel CLI not found. Install with: npm i -g vercel');
    }

    // Deploy
    const deployCommand = this.environment === 'production' 
      ? 'vercel --prod --yes' 
      : 'vercel --yes';
    
    const result = await this.runCommand(deployCommand, `Deploy to ${this.environment}`);
    
    // Extract deployment URL from output
    const deploymentUrl = this.extractDeploymentUrl(result.output);
    if (deploymentUrl) {
      this.log(`🌐 Deployment URL: ${deploymentUrl}`, 'success');
      return deploymentUrl;
    }

    return null;
  }

  extractDeploymentUrl(output) {
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }

  async validateDeployment(deploymentUrl) {
    if (!deploymentUrl) {
      this.log('⚠️ No deployment URL provided, skipping validation', 'warning');
      return;
    }

    this.log('🔍 Validating deployment...');

    // Basic health check
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(deploymentUrl, { timeout: 10000 });
      
      if (response.ok) {
        this.log('✅ Deployment health check passed', 'success');
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (error) {
      this.log(`❌ Deployment validation failed: ${error.message}`, 'error');
      throw error;
    }

    // API endpoints check
    const apiEndpoints = ['/api/transcripts', '/api/analytics/trends'];
    
    for (const endpoint of apiEndpoints) {
      try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(`${deploymentUrl}${endpoint}`, { 
          timeout: 5000,
          headers: { 'User-Agent': 'Deployment-Validator' }
        });
        
        if (response.status === 401 || response.status === 200) {
          // 401 is expected for protected endpoints
          this.log(`✅ API endpoint ${endpoint} is accessible`);
        } else {
          this.log(`⚠️ API endpoint ${endpoint} returned status: ${response.status}`, 'warning');
        }
      } catch (error) {
        this.log(`⚠️ Could not validate API endpoint ${endpoint}: ${error.message}`, 'warning');
      }
    }
  }

  async generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      nodeVersion: process.version,
      deploymentStatus: 'completed',
      buildInfo: {
        nextVersion: this.getPackageVersion('next'),
        reactVersion: this.getPackageVersion('react'),
        typescriptVersion: this.getPackageVersion('typescript')
      }
    };

    const reportPath = path.join(process.cwd(), `deployment-report-${this.environment}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📄 Deployment report saved to: ${reportPath}`);
    return report;
  }

  getPackageVersion(packageName) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.dependencies[packageName] || packageJson.devDependencies[packageName] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async deploy() {
    try {
      this.log(`🚀 Starting deployment to ${this.environment}...`);

      // Pre-deployment validation
      await this.validatePreDeployment();

      // Run tests
      await this.runTests();

      // Build application
      await this.buildApplication();

      // Optimize assets
      await this.optimizeAssets();

      // Deploy (example with Vercel)
      const deploymentUrl = await this.deployToVercel();

      // Validate deployment
      await this.validateDeployment(deploymentUrl);

      // Generate report
      await this.generateDeploymentReport();

      this.log('🎉 Deployment completed successfully!', 'success');
      
      if (deploymentUrl) {
        this.log(`🌐 Your application is live at: ${deploymentUrl}`, 'success');
      }

    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--environment':
      case '-e':
        options.environment = args[++i];
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Deployment Script Usage:
  node scripts/deploy.js [options]

Options:
  -e, --environment <env>  Target environment (default: production)
  --skip-tests            Skip running tests before deployment
  --dry-run               Show what would be done without executing
  -v, --verbose           Show detailed output
  -h, --help              Show this help message

Examples:
  node scripts/deploy.js                    # Deploy to production
  node scripts/deploy.js -e staging         # Deploy to staging
  node scripts/deploy.js --dry-run          # Preview deployment steps
  node scripts/deploy.js --skip-tests -v    # Deploy without tests, verbose output
        `);
        process.exit(0);
    }
  }

  const deployer = new DeploymentManager(options);
  deployer.deploy();
}

module.exports = DeploymentManager;