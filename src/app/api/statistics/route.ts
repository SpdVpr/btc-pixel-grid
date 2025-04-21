import { NextRequest, NextResponse } from 'next/server';
import { getStatistics, formatStatistics, updateStatistics } from '@/lib/db/statistics';

export async function GET(request: NextRequest) {
  try {
    // Vždy aktualizujeme statistiky při každém volání API
    const updatedStats = await updateStatistics();
    
    // Formátování statistik pro frontend
    const formattedStats = formatStatistics(updatedStats);
    
    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error('Chyba při získávání statistik:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při získávání statistik' },
      { status: 500 }
    );
  }
}
