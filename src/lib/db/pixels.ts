import sql from './index';

export type Pixel = {
  id: number;
  x: number;
  y: number;
  color: string;
  url?: string;
  message?: string;
  owner_id?: string;
  purchase_date: Date;
  invoice_id?: string;
};

export type PixelInput = {
  x: number;
  y: number;
  color: string;
  url?: string;
  message?: string;
  owner_id?: string;
};

export type PixelSelection = {
  x: number;
  y: number;
  color: string;
};

// Získání pixelu podle souřadnic
export async function getPixelByCoordinates(x: number, y: number): Promise<Pixel | null> {
  try {
    const result = await sql`
      SELECT * FROM pixels WHERE x = ${x} AND y = ${y}
    `;
    
    return result.rows.length > 0 ? result.rows[0] as Pixel : null;
  } catch (error) {
    console.error('Chyba při získávání pixelu:', error);
    throw error;
  }
}

// Získání pixelů v určitém rozsahu (pro chunking)
export async function getPixelsInRange(
  startX: number, 
  endX: number, 
  startY: number, 
  endY: number
): Promise<Pixel[]> {
  try {
    const result = await sql`
      SELECT * FROM pixels 
      WHERE x >= ${startX} AND x <= ${endX} 
      AND y >= ${startY} AND y <= ${endY}
    `;
    
    return result.rows as Pixel[];
  } catch (error) {
    console.error('Chyba při získávání pixelů v rozsahu:', error);
    throw error;
  }
}

// Rezervace pixelů pro nákup
export async function reservePixels(
  pixels: PixelSelection[],
  invoiceId: string
): Promise<boolean> {
  try {
    // Začátek transakce
    await sql`BEGIN`;
    
    // Kontrola, zda jsou všechny pixely dostupné
    for (const pixel of pixels) {
      const existingPixel = await getPixelByCoordinates(pixel.x, pixel.y);
      if (existingPixel) {
        // Pokud pixel již existuje, zrušíme transakci
        await sql`ROLLBACK`;
        return false;
      }
    }
    
    // Rezervace pixelů
    for (const pixel of pixels) {
      await sql`
        INSERT INTO pixels (x, y, color, invoice_id)
        VALUES (${pixel.x}, ${pixel.y}, ${pixel.color}, ${invoiceId})
      `;
    }
    
    // Potvrzení transakce
    await sql`COMMIT`;
    return true;
  } catch (error) {
    // V případě chyby zrušíme transakci
    await sql`ROLLBACK`;
    console.error('Chyba při rezervaci pixelů:', error);
    throw error;
  }
}

// Aktualizace pixelů po úspěšné platbě
export async function updatePixelsAfterPayment(
  invoiceId: string,
  ownerId: string,
  pixelData: { url?: string; message?: string }
): Promise<boolean> {
  try {
    await sql`
      UPDATE pixels
      SET owner_id = ${ownerId},
          url = ${pixelData.url || null},
          message = ${pixelData.message || null},
          purchase_date = CURRENT_TIMESTAMP
      WHERE invoice_id = ${invoiceId}
    `;
    
    return true;
  } catch (error) {
    console.error('Chyba při aktualizaci pixelů po platbě:', error);
    throw error;
  }
}

// Zrušení rezervace pixelů (např. při vypršení platby)
export async function cancelPixelReservation(invoiceId: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM pixels
      WHERE invoice_id = ${invoiceId} AND owner_id IS NULL
    `;
    
    return true;
  } catch (error) {
    console.error('Chyba při rušení rezervace pixelů:', error);
    throw error;
  }
}

// Počet prodaných pixelů
export async function getPixelsSoldCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM pixels WHERE owner_id IS NOT NULL
    `;
    
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Chyba při získávání počtu prodaných pixelů:', error);
    throw error;
  }
}