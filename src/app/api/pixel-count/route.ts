import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    // Count all pixels in the database, which should match what's shown in the console
    const pixelCount = await sql`
      SELECT COUNT(*) as count FROM pixels
    `;
    
    const stats = await sql`
      SELECT * FROM statistics LIMIT 1
    `;
    
    const count = parseInt(pixelCount.rows[0].count || '0', 10);
    console.log(`API: Total pixels count: ${count}`);
    console.log(`Statistics table data:`, stats.rows[0]);
    
    return NextResponse.json({
      pixel_count: count,
      statistics_data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error getting pixel count:', error);
    return NextResponse.json(
      { error: 'An error occurred while getting pixel count' },
      { status: 500 }
    );
  }
}
