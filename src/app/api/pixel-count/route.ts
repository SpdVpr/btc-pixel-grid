import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    // Count all pixels in the database, which should match what's shown in the console
    const result = await sql`
      SELECT COUNT(*) as count FROM pixels
    `;
    
    const count = parseInt(result.rows[0].count || '0', 10);
    console.log(`API: Total pixels count: ${count}`);
    
    return NextResponse.json({
      count: count
    });
  } catch (error) {
    console.error('Error getting pixel count:', error);
    return NextResponse.json(
      { error: 'An error occurred while getting pixel count' },
      { status: 500 }
    );
  }
}
