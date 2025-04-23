import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    // Count only pixels that have an owner and are not demo-preview pixels
    const result = await sql`
      SELECT COUNT(*) as count FROM pixels 
      WHERE owner_id IS NOT NULL AND owner_id != 'demo-preview'
    `;
    
    const count = parseInt(result.rows[0].count || '0', 10);
    console.log(`API: Sold pixels count (excluding demo-preview): ${count}`);
    
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
