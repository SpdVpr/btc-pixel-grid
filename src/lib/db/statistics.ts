import sql from './index';
import { getPixelsSoldCount } from './pixels';
import { getTotalAmountCollected } from './transactions';

export type Statistics = {
  id: number;
  total_pixels_sold: number;
  total_satoshis_collected: number;
  last_updated: Date;
};

// Získání aktuálních statistik
export async function getStatistics(): Promise<Statistics> {
  try {
    const result = await sql`
      SELECT * FROM statistics ORDER BY id LIMIT 1
    `;
    
    return result.rows[0] as Statistics;
  } catch (error) {
    console.error('Chyba při získávání statistik:', error);
    throw error;
  }
}

// Aktualizace statistik
export async function updateStatistics(): Promise<Statistics> {
  try {
    // Získání aktuálních hodnot
    const pixelsSold = await getPixelsSoldCount();
    const satoshisCollected = await getTotalAmountCollected();
    
    // Aktualizace statistik
    const result = await sql`
      UPDATE statistics
      SET total_pixels_sold = ${pixelsSold},
          total_satoshis_collected = ${satoshisCollected},
          last_updated = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM statistics ORDER BY id LIMIT 1)
      RETURNING *
    `;
    
    return result.rows[0] as Statistics;
  } catch (error) {
    console.error('Chyba při aktualizaci statistik:', error);
    throw error;
  }
}

// Výpočet procenta prodaných pixelů (z celkových 100 000 000)
export function getPercentageSold(totalPixelsSold: number): number {
  const totalPixels = 100000000; // 100 milionů pixelů = 1 BTC
  return (totalPixelsSold / totalPixels) * 100;
}

// Výpočet procenta vybraných satoshi (z celkových 100 000 000)
export function getPercentageCollected(totalSatoshisCollected: number): number {
  const totalSatoshis = 100000000; // 100 milionů satoshi = 1 BTC
  return (totalSatoshisCollected / totalSatoshis) * 100;
}

// Formátování statistik pro frontend
export function formatStatistics(stats: Statistics) {
  return {
    totalPixelsSold: stats.total_pixels_sold,
    totalSatoshisCollected: stats.total_satoshis_collected,
    percentageSold: getPercentageSold(stats.total_pixels_sold).toFixed(6),
    percentageCollected: getPercentageCollected(stats.total_satoshis_collected).toFixed(6),
    lastUpdated: stats.last_updated,
  };
}