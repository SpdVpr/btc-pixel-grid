import { NextRequest, NextResponse } from 'next/server';
import { getStatistics, formatStatistics, updateStatistics } from '@/lib/db/statistics';

export async function GET(request: NextRequest) {
  try {
    // Získání statistik z databáze
    const statistics = await getStatistics();
    
    // Aktualizace statistik v databázi (jednou za minutu)
    // Kontrola, zda poslední aktualizace byla před více než minutou
    const lastUpdate = new Date(statistics.last_updated);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    let updatedStats = statistics;
    
    // Pokud uplynula více než minuta od poslední aktualizace, aktualizujeme statistiky
    if (diffInMinutes >= 1) {
      updatedStats = await updateStatistics();
    }
    
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
