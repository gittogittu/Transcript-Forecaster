import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function createDatabasePool(config: DatabaseConfig): Pool {
  // Prefer connection string for Neon DB
  if (config.connectionString) {
    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      ssl: config.ssl || { rejectUnauthorized: false },
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 10000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 20000,
    };
    return new Pool(poolConfig);
  }

  // Fallback to individual connection parameters
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: config.maxConnections || 20,
    idleTimeoutMillis: config.idleTimeoutMillis || 10000,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 20000,
  };

  return new Pool(poolConfig);
}

export function getDatabasePool(): Pool {
  if (!pool) {
    const config: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 5432,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) : 20,
      idleTimeoutMillis: process.env.DATABASE_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_IDLE_TIMEOUT) : 10000,
      connectionTimeoutMillis: process.env.DATABASE_POOL_TIMEOUT ? parseInt(process.env.DATABASE_POOL_TIMEOUT) : 20000,
    };

    pool = createDatabasePool(config);
  }

  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const testPool = getDatabasePool();
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}