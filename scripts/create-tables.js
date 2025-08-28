require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Creating database tables...');
    
    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        image TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create clients table
    console.log('Creating clients table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create transcripts table
    console.log('Creating transcripts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        transcript_count INTEGER NOT NULL CHECK (transcript_count >= 0),
        transcript_type VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        UNIQUE(client_id, date)
      );
    `);
    
    // Create predictions table
    console.log('Creating predictions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        prediction_type VARCHAR(20) NOT NULL CHECK (prediction_type IN ('daily', 'weekly', 'monthly')),
        model_type VARCHAR(50) NOT NULL,
        confidence DECIMAL(5,4),
        accuracy DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      );
    `);
    
    // Create prediction details table
    console.log('Creating prediction_details table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prediction_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
        predicted_date DATE NOT NULL,
        predicted_count INTEGER NOT NULL,
        confidence_lower INTEGER NOT NULL,
        confidence_upper INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create performance metrics table
    console.log('Creating performance_metrics table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP DEFAULT NOW(),
        queries_per_second DECIMAL(10,2),
        model_runtime DECIMAL(10,3),
        data_sync_latency DECIMAL(10,3),
        error_count INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        memory_usage DECIMAL(10,2),
        cpu_usage DECIMAL(5,2)
      );
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transcripts_client_date ON transcripts(client_id, date);
      CREATE INDEX IF NOT EXISTS idx_transcripts_date ON transcripts(date);
      CREATE INDEX IF NOT EXISTS idx_predictions_client_date ON predictions(client_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);
      CREATE INDEX IF NOT EXISTS idx_prediction_details_prediction_id ON prediction_details(prediction_id);
      CREATE INDEX IF NOT EXISTS idx_prediction_details_date ON prediction_details(predicted_date);
      CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    
    console.log('✓ All tables and indexes created successfully');
  } catch (error) {
    console.error('Table creation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();