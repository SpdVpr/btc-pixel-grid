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
    let insertedCount = 0;
    for (const pixel of testPixels) {
      try {
        await sql`
          INSERT INTO pixels (x, y, color, owner_id, purchase_date)
          VALUES (${pixel.x}, ${pixel.y}, ${pixel.color}, 'test-user', CURRENT_TIMESTAMP)
          ON CONFLICT (x, y) DO NOTHING
        `;
        insertedCount++;
      } catch (err) {
        console.error(`Chyba při vkládání pixelu [${pixel.x},${pixel.y}]:`, err);
      }
    }
    
    // Kontrola, zda byly pixely úspěšně vloženy
    const countResult = await sql`SELECT COUNT(*) as count FROM pixels`;
    const totalPixels = parseInt(countResult.rows[0].count, 10);
    
    console.log(`Celkem v databázi: ${totalPixels} pixelů, nově vloženo: ${insertedCount}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Databáze byla úspěšně resetována a přidány testovací pixely',
      pixelsAdded: insertedCount,
      totalPixels: totalPixels
    });
  } catch (error) {
    console.error('Chyba při resetování databáze:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při resetování databáze', details: error },
      { status: 500 }
    );
  }
}
