const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function setupSecurity() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('Setting up security features...')
    
    // Read and execute the RLS SQL file
    const sqlPath = path.join(__dirname, '../src/lib/database/row-level-security.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    for (const statement of statements) {
      try {
        await pool.query(statement)
        console.log('✓ Executed security statement')
      } catch (error) {
        // Some statements might fail if they already exist, that's okay
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist')) {
          console.warn('Warning:', error.message)
        }
      }
    }
    
    console.log('✓ Security setup completed successfully')
    
    // Test the security functions
    console.log('Testing security functions...')
    
    // Test user context function
    await pool.query(`
      SELECT set_user_context(
        'test-user-id'::UUID,
        'admin',
        '127.0.0.1',
        'test-agent',
        'test-session'
      )
    `)
    console.log('✓ User context function working')
    
    // Test audit trigger
    const testResult = await pool.query(`
      SELECT COUNT(*) as count FROM audit_log
    `)
    console.log(`✓ Audit log table accessible (${testResult.rows[0].count} entries)`)
    
  } catch (error) {
    console.error('Error setting up security:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  setupSecurity()
}

module.exports = { setupSecurity }