import { getDatabasePool } from './connection';

export interface DatabaseHealthCheck {
  isConnected: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Perform a health check on the database connection
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();
  
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    try {
      // Simple query to test connection
      await client.query('SELECT 1 as health_check');
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        latency,
        timestamp: new Date()
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * Check if the database schema is properly initialized
 */
export async function checkDatabaseSchema(): Promise<{
  isInitialized: boolean;
  missingTables: string[];
  error?: string;
}> {
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    try {
      // Check for required tables
      const requiredTables = ['clients', 'transcripts', 'predictions', 'migrations'];
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      `, [requiredTables]);
      
      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      return {
        isInitialized: missingTables.length === 0,
        missingTables
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      isInitialized: false,
      missingTables: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get database connection info (without sensitive data)
 */
export async function getDatabaseInfo(): Promise<{
  host?: string;
  database?: string;
  ssl: boolean;
  maxConnections: number;
  version?: string;
}> {
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    try {
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0]?.version;
      
      return {
        host: process.env.DATABASE_HOST,
        database: process.env.DATABASE_NAME,
        ssl: process.env.DATABASE_SSL === 'true',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
        version
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      ssl: process.env.DATABASE_SSL === 'true',
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20')
    };
  }
}