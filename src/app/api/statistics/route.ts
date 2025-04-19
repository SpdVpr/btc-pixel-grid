import { NextRequest, NextResponse } from 'next/server';
import { mockStatistics } from '@/lib/db/mock';

export async function GET(request: NextRequest) {
  try {
    // Vrácení mock statistik
    return NextResponse.json(mockStatistics);
  } catch (error) {
    console.error('Chyba při získávání statistik:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při získávání statistik' },
      { status: 500 }
    );
  }
}