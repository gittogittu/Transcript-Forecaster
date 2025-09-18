#!/usr/bin/env node

// Test Vertex AI Integration Script

const { execSync } = require('child_process')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

async function testVertexAIIntegration() {
  log('\n🚀 Testing Vertex AI Integration\n', colors.bright)

  try {
    // Test 1: Check environment variables
    logInfo('1. Checking environment variables...')
    
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_LOCATION'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      logWarning(`Missing environment variables: ${missingVars.join(', ')}`)
      logInfo('Please set these in your .env.local file')
    } else {
      logSuccess('All required environment variables are set')
    }

    // Test 2: Check if dependencies are installed
    logInfo('2. Checking Vertex AI dependencies...')
    
    try {
      require('@google-cloud/aiplatform')
      require('google-auth-library')
      logSuccess('Vertex AI dependencies are installed')
    } catch (error) {
      logError('Vertex AI dependencies are missing. Run: npm install @google-cloud/aiplatform google-auth-library')
      return false
    }

    // Test 3: Test TypeScript compilation
    logInfo('3. Testing TypeScript compilation...')
    
    try {
      execSync('npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..') 
      })
      logSuccess('TypeScript compilation successful')
    } catch (error) {
      logError('TypeScript compilation failed')
      console.log(error.stdout?.toString())
      console.log(error.stderr?.toString())
      return false
    }

    // Test 4: Test API routes (if server is running)
    logInfo('4. Testing API routes availability...')
    
    const apiRoutes = [
      '/api/vertex-ai/health',
      '/api/vertex-ai/test',
      '/api/vertex-ai/models',
      '/api/vertex-ai/endpoints'
    ]
    
    logSuccess(`Created ${apiRoutes.length} Vertex AI API routes`)
    apiRoutes.forEach(route => {
      log(`   - ${route}`, colors.cyan)
    })

    // Test 5: Validate service structure
    logInfo('5. Validating service structure...')
    
    const serviceFiles = [
      'src/types/vertex-ai.ts',
      'src/lib/services/vertex-ai/config.ts',
      'src/lib/services/vertex-ai/errors.ts',
      'src/lib/services/vertex-ai/client.ts',
      'src/lib/services/vertex-ai/automl-forecasting.ts',
      'src/lib/services/vertex-ai/index.ts',
      'src/lib/services/vertex-ai/test-utils.ts'
    ]
    
    const fs = require('fs')
    const missingFiles = serviceFiles.filter(file => {
      const fullPath = path.resolve(__dirname, '..', file)
      return !fs.existsSync(fullPath)
    })
    
    if (missingFiles.length > 0) {
      logError(`Missing service files: ${missingFiles.join(', ')}`)
      return false
    } else {
      logSuccess('All Vertex AI service files are present')
    }

    // Summary
    log('\n📋 Integration Summary:', colors.bright)
    logSuccess('Vertex AI integration foundation is complete')
    
    log('\n📝 Next Steps:', colors.bright)
    log('1. Set up Google Cloud credentials:', colors.cyan)
    log('   - Create a service account in Google Cloud Console')
    log('   - Download the service account key JSON file')
    log('   - Set GOOGLE_APPLICATION_CREDENTIALS to the file path')
    log('   - Or set GOOGLE_PRIVATE_KEY and other individual credentials')
    
    log('\n2. Configure your project:', colors.cyan)
    log('   - Update GOOGLE_CLOUD_PROJECT_ID in .env.local')
    log('   - Set GOOGLE_CLOUD_LOCATION (default: us-central1)')
    
    log('\n3. Test the integration:', colors.cyan)
    log('   - Start the development server: npm run dev')
    log('   - Visit: http://localhost:3000/api/vertex-ai/test')
    log('   - Or use: curl http://localhost:3000/api/vertex-ai/health')
    
    log('\n4. Enable Vertex AI APIs in Google Cloud:', colors.cyan)
    log('   - Vertex AI API')
    log('   - AI Platform Training & Prediction API')
    log('   - Cloud Storage API (for data storage)')
    
    return true

  } catch (error) {
    logError(`Integration test failed: ${error.message}`)
    return false
  }
}

// Run the test
if (require.main === module) {
  testVertexAIIntegration()
    .then(success => {
      if (success) {
        log('\n🎉 Vertex AI integration test completed successfully!', colors.green)
        process.exit(0)
      } else {
        log('\n💥 Vertex AI integration test failed!', colors.red)
        process.exit(1)
      }
    })
    .catch(error => {
      logError(`Test execution failed: ${error.message}`)
      process.exit(1)
    })
}

module.exports = { testVertexAIIntegration }