const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check clients table
    try {
      const clientsCount = await client.query('SELECT COUNT(*) FROM clients');
      console.log(`\n👥 Clients: ${clientsCount.rows[0].count} records`);
    } catch (error) {
      console.log('\n⚠️  Clients table not found or empty');
    }
    
    // Check transcripts table
    try {
      const transcriptsCount = await client.query('SELECT COUNT(*) FROM transcripts');
      console.log(`📄 Transcripts: ${transcriptsCount.rows[0].count} records`);
    } catch (error) {
      console.log('⚠️  Transcripts table not found or empty');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();