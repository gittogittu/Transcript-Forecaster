#!/usr/bin/env node

/**
 * Database Setup Script for Neon DB
 * 
 * This script helps set up the database connection and run initial migrations.
 * Run with: node scripts/setup-database.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Transcript Analytics Platform Database...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log('📝 Please copy .env.example to .env.local and configure your Neon DB connection string.');
  console.log('   You can get your connection string from: https://console.neon.tech/');
  process.exit(1);
}

// Check if DATABASE_URL is configured
const envContent = fs.readFileSync(envPath, 'utf-8');
if (!envContent.includes('DATABASE_URL=postgresql://') || envContent.includes('ep-example-123456')) {
  console.error('❌ DATABASE_URL not properly configured!');
  console.log('📝 Please update your .env.local file with your actual Neon DB connection string.');
  console.log('   Format: DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require');
  process.exit(1);
}

console.log('✅ Environment configuration found');

// Test database connection
console.log('🔍 Testing database connection...');
try {
  execSync('npm run db:status', { stdio: 'inherit' });
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed');
  console.log('💡 Make sure your Neon database is running and the connection string is correct.');
  process.exit(1);
}

// Run migrations
console.log('\n📦 Running database migrations...');
try {
  execSync('npm run db:migrate', { stdio: 'inherit' });
  console.log('✅ Database migrations completed');
} catch (error) {
  console.error('❌ Database migrations failed');
  process.exit(1);
}

// Test the setup
console.log('\n🧪 Testing database setup...');
try {
  const { spawn } = require('child_process');
  
  // Start the dev server briefly to test the API
  console.log('Starting development server to test API...');
  const server = spawn('npm', ['run', 'dev'], { 
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  // Wait for server to start
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Ready')) {
        resolve();
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(resolve, 30000);
  });

  // Test the health endpoint
  const fetch = require('node-fetch');
  try {
    const response = await fetch('http://localhost:3000/api/health/database');
    const result = await response.json();
    
    if (result.status === 'healthy') {
      console.log('✅ Database health check passed');
    } else {
      console.log('⚠️  Database health check returned:', result.status);
    }
  } catch (fetchError) {
    console.log('⚠️  Could not test health endpoint (server may still be starting)');
  }

  // Kill the server
  server.kill();

} catch (testError) {
  console.log('⚠️  Could not run full setup test, but migrations completed successfully');
}

console.log('\n🎉 Database setup completed!');
console.log('\n📋 Next steps:');
console.log('   1. Run "npm run dev" to start the development server');
console.log('   2. Visit http://localhost:3000/api/health/database to check database status');
console.log('   3. Configure your Google Sheets integration (if needed)');
console.log('   4. Start building your transcript analytics platform!');

// Helper function to promisify setTimeout
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}