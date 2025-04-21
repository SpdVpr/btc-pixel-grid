import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/index';

export async function POST(request: NextRequest) {
  try {
    // Resetování tabulky pixels
    await sql`TRUNCATE TABLE pixels RESTART IDENTITY CASCADE`;
    
    // Resetování tabulky transactions
    await sql`TRUNCATE TABLE transactions RESTART IDENTITY CASCADE`;
    
    // Resetování statistik
    await sql`UPDATE statistics SET total_pixels_sold = 0, total_satoshis_collected = 0, last_updated = CURRENT_TIMESTAMP`;
    
    // Přidání testovacích pixelů pro demonstraci
    const testPixels = [];
    
    // Vytvoření 100 náhodných pixelů
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * 10000);
      const y = Math.floor(Math.random() * 10000);
      const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
      
      testPixels.push({ x, y, color });
    }
    
    // Přidání testovacích pixelů do databáze
    for (const pixel of testPixels) {
      await sql`
        INSERT INTO pixels (x, y, color, owner_id)
        VALUES (${pixel.x}, ${pixel.y}, ${pixel.color}, 'test-user')
        ON CONFLICT (x, y) DO NOTHING
      `;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Databáze byla úspěšně resetována a přidány testovací pixely',
      pixelsAdded: testPixels.length
    });
  } catch (error) {
    console.error('Chyba při resetování databáze:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při resetování databáze', details: error },
      { status: 500 }
    );
  }
}
