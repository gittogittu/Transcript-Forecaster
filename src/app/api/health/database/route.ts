import { NextResponse } from 'next/server';
import { checkDatabaseHealth, checkDatabaseSchema, getDatabaseInfo } from '@/lib/database/health-check';

export async function GET() {
  try {
    const [healthCheck, schemaCheck, dbInfo] = await Promise.all([
      checkDatabaseHealth(),
      checkDatabaseSchema(),
      getDatabaseInfo()
    ]);

    const response = {
      status: healthCheck.isConnected && schemaCheck.isInitialized ? 'healthy' : 'unhealthy',
      connection: {
        isConnected: healthCheck.isConnected,
        latency: healthCheck.latency,
        error: healthCheck.error
      },
      schema: {
        isInitialized: schemaCheck.isInitialized,
        missingTables: schemaCheck.missingTables,
        error: schemaCheck.error
      },
      database: dbInfo,
      timestamp: new Date().toISOString()
    };

    const statusCode = response.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}