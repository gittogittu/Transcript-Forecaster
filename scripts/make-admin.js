#!/usr/bin/env node

/**
 * Script to make a user an admin
 * Usage: node scripts/make-admin.js <email>
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function makeUserAdmin(email) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Create the user as admin if they don't exist
      const createResult = await pool.query(
        `INSERT INTO users (email, name, role) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, name, role`,
        [email, email.split('@')[0], 'admin']
      );
      
      console.log('✅ Created new admin user:', createResult.rows[0]);
    } else {
      // Update existing user to admin
      const updateResult = await pool.query(
        'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, name, role',
        ['admin', email]
      );
      
      console.log('✅ Updated user to admin:', updateResult.rows[0]);
    }
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

makeUserAdmin(email);