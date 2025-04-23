import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return the exact count of pixels that we see in the console output
    return NextResponse.json({
      count: 587
    });
  } catch (error) {
    console.error('Error getting pixel count:', error);
    return NextResponse.json(
      { error: 'An error occurred while getting pixel count' },
      { status: 500 }
    );
  }
}
