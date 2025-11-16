import { NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET() {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    
    return NextResponse.json(
      {
        status: 'healthy',
        service: 'web',
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'web',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Disable caching for health checks
export const dynamic = 'force-dynamic';
export const revalidate = 0;