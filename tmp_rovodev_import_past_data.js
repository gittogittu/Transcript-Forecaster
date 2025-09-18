require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importPastData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('🚀 Starting import of past data...');
    
    // Read client-wise data
    const clientDataPath = path.join('Past data', 'Monthly files count  - Client wise break up.csv');
    const clientData = fs.readFileSync(clientDataPath, 'utf8');
    
    // Read month-wise data
    const monthDataPath = path.join('Past data', 'Monthly files count  - Month wise break up.csv');
    const monthData = fs.readFileSync(monthDataPath, 'utf8');
    
    // Parse client-wise data
    const clientLines = clientData.split('\n').filter(line => line.trim());
    const clientHeaders = clientLines[0].split(',');
    
    console.log('📊 Processing client-wise data...');
    
    // First, ensure clients exist in the database
    for (let i = 1; i < clientLines.length - 1; i++) { // Skip header and Grand Total
      const values = clientLines[i].split(',');
      const clientName = values[0];
      
      if (clientName && !clientName.includes('Grand Total')) {
        // Extract AHT values
        const overallAHT = parseFloat(values[1]) || null;
        const reviewAHT = parseFloat(values[2]) || null;
        const validationAHT = parseFloat(values[3]) || null;
        
        // Insert or update client
        await pool.query(`
          INSERT INTO clients (name, overall_aht, review_aht, validation_aht, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (name) DO UPDATE SET
            overall_aht = EXCLUDED.overall_aht,
            review_aht = EXCLUDED.review_aht,
            validation_aht = EXCLUDED.validation_aht,
            updated_at = NOW()
        `, [clientName, overallAHT, reviewAHT, validationAHT]);
        
        console.log(`✅ Client processed: ${clientName}`);
        
        // Process monthly data for this client
        const months = ['Jun-2024', 'Jul-2024', 'Aug-2024', 'Sep-2024', 'Oct-2024', 'Nov-2024', 
                       'Dec-2024', 'Jan-2025', 'Feb-2025', 'Mar-2025', 'Apr-2025', 'May-2025', 'Jun-2025'];
        
        for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
          const monthValue = values[4 + monthIndex];
          if (monthValue && monthValue.trim() && monthValue !== '0') {
            // Clean the value (remove commas and quotes)
            const transcriptCount = parseInt(monthValue.replace(/[",]/g, '')) || 0;
            
            if (transcriptCount > 0) {
              // Convert month string to date
              const [monthName, year] = months[monthIndex].split('-');
              const monthNum = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
              }[monthName];
              
              const date = `${year}-${monthNum}-01`;
              
              // Insert transcript data
              await pool.query(`
                INSERT INTO transcripts (client_name, date, transcript_count, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (client_name, date) DO UPDATE SET
                  transcript_count = EXCLUDED.transcript_count,
                  updated_at = NOW()
              `, [clientName, date, transcriptCount]);
            }
          }
        }
      }
    }
    
    console.log('📈 Processing month-wise summary data...');
    
    // Parse month-wise data
    const monthLines = monthData.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < monthLines.length; i++) { // Skip header
      const values = monthLines[i].split(',');
      const monthStr = values[0];
      const totalUploaded = parseInt(values[1]) || 0;
      const totalProcessed = parseInt(values[2]) || 0;
      
      if (monthStr && totalUploaded > 0) {
        // Parse month string (e.g., "Jan 2024")
        const [monthName, year] = monthStr.split(' ');
        const monthNum = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
          'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        }[monthName];
        
        const date = `${year}-${monthNum}-01`;
        
        // Insert monthly summary data
        await pool.query(`
          INSERT INTO monthly_transcript_data (
            month, total_transcripts, total_uploaded, total_processed, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (month) DO UPDATE SET
            total_transcripts = EXCLUDED.total_transcripts,
            total_uploaded = EXCLUDED.total_uploaded,
            total_processed = EXCLUDED.total_processed,
            updated_at = NOW()
        `, [date, totalProcessed, totalUploaded, totalProcessed]);
        
        console.log(`✅ Monthly data processed: ${monthStr}`);
      }
    }
    
    // Generate summary statistics
    const clientCount = await pool.query('SELECT COUNT(*) as count FROM clients');
    const transcriptCount = await pool.query('SELECT COUNT(*) as count FROM transcripts');
    const totalTranscripts = await pool.query('SELECT SUM(transcript_count) as total FROM transcripts');
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Clients imported: ${clientCount.rows[0].count}`);
    console.log(`   - Transcript records: ${transcriptCount.rows[0].count}`);
    console.log(`   - Total transcripts: ${totalTranscripts.rows[0].total || 0}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

importPastData();