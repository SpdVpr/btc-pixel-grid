import { NextRequest, NextResponse } from 'next/server';
import { updateStatistics } from '@/lib/db/statistics';

/**
 * Force update statistics API
 * 
 * This endpoint forces an immediate update of the statistics.
 * It can be used to refresh the statistics after fixing issues.
 */
export async function GET(request: NextRequest) {
  try {
    // Force update statistics
    const updatedStats = await updateStatistics();
    
    return NextResponse.json({
      success: true,
      message: 'Statistics updated successfully',
      statistics: updatedStats
    });
  } catch (error) {
    console.error('Error updating statistics:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating statistics' },
      { status: 500 }
    );
  }
}
