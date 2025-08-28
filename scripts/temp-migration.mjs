
      import { MigrationRunner } from '../src/lib/database/migration-runner.js';
      import { getDatabasePool } from '../src/lib/database/connection.js';
      
      async function main() {
        try {
          const pool = getDatabasePool();
          const migrationRunner = new MigrationRunner(pool);
          
          const status = await migrationRunner.getStatus();
          console.log('Current status:');
          console.log('  Available migrations:', status.availableCount);
          console.log('  Executed migrations:', status.executedCount);
          console.log('  Pending migrations:', status.pendingCount);
          console.log('  Up to date:', status.isUpToDate ? 'YES' : 'NO');

          if (!status.isUpToDate) {
            console.log('\nRunning pending migrations...');
            const results = await migrationRunner.runMigrations();
            
            console.log('\n=== Migration Results ===');
            results.forEach(result => {
              const status = result.success ? '✓' : '✗';
              console.log(status + ' ' + result.version + ' - ' + (result.success ? 'Success' : result.error));
            });
          } else {
            console.log('\nDatabase is up to date');
          }
          
          await pool.end();
        } catch (error) {
          console.error('Migration failed:', error);
          process.exit(1);
        }
      }
      
      main();
    