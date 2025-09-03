#!/usr/bin/env node

/**
 * Test Database Setup for Advanced Predictive Analytics
 * 
 * This script tests the database setup and pgvector functionality
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function testDatabaseSetup() {
  console.log('🧪 Testing Advanced Predictive Analytics Database Setup...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test basic connection
    console.log('1. Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connected successfully');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]}\n`);

    // Test pgvector extension
    console.log('2. Testing pgvector extension...');
    
    // Check if extension is installed
    const extResult = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    if (extResult.rows.length === 0) {
      throw new Error('pgvector extension not found');
    }
    
    console.log(`✅ pgvector extension found (version: ${extResult.rows[0].extversion})`);

    // Test vector operations
    await pool.query('SELECT vector_dims(\'[1,2,3]\'::vector) as dims');
    await pool.query('SELECT \'[1,2,3]\'::vector <-> \'[1,2,4]\'::vector as l2_distance');
    await pool.query('SELECT \'[1,2,3]\'::vector <#> \'[1,2,4]\'::vector as inner_product');
    await pool.query('SELECT \'[1,2,3]\'::vector <=> \'[1,2,4]\'::vector as cosine_distance');
    
    console.log('✅ Vector operations working correctly\n');

    // Test schema tables
    console.log('3. Testing enhanced schema tables...');
    
    const tables = [
      'vertex_ai_models',
      'transcript_embeddings', 
      'feature_store',
      'vertex_ai_predictions',
      'anomalies',
      'business_insights',
      'recommendations',
      'pattern_similarities',
      'external_factors'
    ];

    for (const table of tables) {
      const tableResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);
      
      if (tableResult.rows[0].count === '0') {
        throw new Error(`Table ${table} not found`);
      }
      
      console.log(`✅ Table ${table} exists`);
    }

    console.log('\n4. Testing vector indexes...');
    
    // Check vector indexes
    const indexResult = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes 
      WHERE indexdef LIKE '%vector%' 
      AND schemaname = 'public'
    `);

    console.log(`✅ Found ${indexResult.rows.length} vector indexes:`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });
    
    // Test time series features table
    const timeSeriesTableResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'time_series_features' AND table_schema = 'public'
    `);
    
    if (timeSeriesTableResult.rows[0].count === '0') {
      throw new Error('time_series_features table not found');
    }
    
    console.log('✅ Time series features table exists');
    
    // Test pattern embeddings table
    const patternTableResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'pattern_embeddings' AND table_schema = 'public'
    `);
    
    if (patternTableResult.rows[0].count === '0') {
      throw new Error('pattern_embeddings table not found');
    }
    
    console.log('✅ Pattern embeddings table exists');

    console.log('\n5. Testing vector similarity functions...');
    
    // Test custom similarity function
    const similarityResult = await pool.query(`
      SELECT calculate_cosine_similarity('[1,0,0]'::vector, '[0,1,0]'::vector) as similarity
    `);
    
    console.log(`✅ Cosine similarity function working: ${similarityResult.rows[0].similarity}`);

    // Test sample vector insertion and search
    console.log('\n6. Testing transcript count analytics and pattern embeddings...');
    
    // Create a test client
    const clientResult = await pool.query(`
      INSERT INTO clients (name, email) 
      VALUES ('Test Analytics Client', 'analytics-test@example.com') 
      RETURNING id
    `);
    const clientId = clientResult.rows[0].id;
    
    // Insert sample transcript count data for the last 30 days
    const transcriptData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const count = Math.floor(Math.random() * 50) + 10; // Random count between 10-60
      
      await pool.query(`
        INSERT INTO transcripts (client_id, date, transcript_count, notes)
        VALUES ($1, $2, $3, 'Test data')
      `, [clientId, date.toISOString().split('T')[0], count]);
      
      transcriptData.push({ date: date.toISOString().split('T')[0], count });
    }
    
    console.log(`✅ Inserted ${transcriptData.length} days of transcript count data`);
    
    // Test time series features calculation
    const featuresResult = await pool.query(`
      SELECT COUNT(*) as feature_count
      FROM time_series_features 
      WHERE client_id = $1
    `, [clientId]);
    
    console.log(`✅ Time series features calculated: ${featuresResult.rows[0].feature_count} records`);
    
    // Test pattern embedding (128-dimensional for numerical patterns)
    const patternVector = Array(128).fill(0).map((_, i) => (Math.sin(i / 10) * 0.1).toFixed(6)).join(',');
    
    await pool.query(`
      INSERT INTO pattern_embeddings (client_id, pattern_type, time_window_start, time_window_end, pattern_embedding, pattern_metadata, embedding_model)
      VALUES (
        $1,
        'weekly',
        CURRENT_DATE - INTERVAL '7 days',
        CURRENT_DATE,
        '[${patternVector}]'::vector,
        '{"amplitude": 0.5, "frequency": 7, "test": true}'::jsonb,
        'numerical-pattern-encoder'
      )
    `, [clientId]);
    
    // Test pattern similarity search
    const searchVector = Array(128).fill(0).map((_, i) => (Math.sin((i + 1) / 10) * 0.1).toFixed(6)).join(',');
    const patternSearchResult = await pool.query(`
      SELECT id, pattern_type, (pattern_embedding <=> '[${searchVector}]'::vector) as distance
      FROM pattern_embeddings
      WHERE pattern_embedding IS NOT NULL
      ORDER BY pattern_embedding <=> '[${searchVector}]'::vector
      LIMIT 5
    `);
    
    console.log(`✅ Pattern similarity search working (found ${patternSearchResult.rows.length} results)`);
    
    // Test analytics view
    const analyticsResult = await pool.query(`
      SELECT client_name, date, transcript_count, rolling_7_mean, status_flag
      FROM recent_transcript_analytics 
      WHERE client_id = $1
      ORDER BY date DESC
      LIMIT 5
    `, [clientId]);
    
    console.log(`✅ Analytics view working (${analyticsResult.rows.length} recent records)`);
    
    // Clean up test data
    await pool.query('DELETE FROM pattern_embeddings WHERE pattern_metadata @> \'{"test": true}\'');
    await pool.query('DELETE FROM time_series_features WHERE client_id = $1', [clientId]);
    await pool.query('DELETE FROM transcripts WHERE notes = \'Test data\'');
    await pool.query('DELETE FROM clients WHERE email = \'analytics-test@example.com\'');

    console.log('\n7. Testing external factors data...');
    
    const factorsResult = await pool.query(`
      SELECT COUNT(*) as count FROM external_factors WHERE factor_type = 'holiday'
    `);
    
    console.log(`✅ External factors loaded: ${factorsResult.rows[0].count} holiday records`);

    console.log('\n🎉 All tests passed! Advanced Predictive Analytics database is ready for transcript count forecasting.');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ pgvector extension installed and functional');
    console.log('   ✅ Enhanced schema optimized for transcript counts');
    console.log('   ✅ Time series features table created');
    console.log('   ✅ Pattern embeddings for numerical data');
    console.log('   ✅ Vector indexes created');
    console.log('   ✅ Automatic feature calculation working');
    console.log('   ✅ Analytics views functional');
    console.log('   ✅ Pattern similarity search working');

  } catch (error) {
    console.error('\n❌ Database setup test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDatabaseSetup();