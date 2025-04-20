import { NextRequest, NextResponse } from 'next/server';
import { getPixelsInRange } from '@/lib/db/pixels';

export async function GET(request: NextRequest) {
  try {
    // Získání parametrů z URL
    const searchParams = request.nextUrl.searchParams;
    const startX = parseInt(searchParams.get('startX') || '0', 10);
    const endX = parseInt(searchParams.get('endX') || '100', 10);
    const startY = parseInt(searchParams.get('startY') || '0', 10);
    const endY = parseInt(searchParams.get('endY') || '100', 10);

    // Omezení velikosti požadavku pro výkon
    const maxChunkSize = 100000; // Zvýšeno na 100000 pixelů pro lepší výkon s velkým plátnem
    
    // Kontrola velikosti požadavku
    const requestSize = (endX - startX) * (endY - startY);
    
    if (requestSize > maxChunkSize) {
      // Pokud je požadavek příliš velký, vrátíme pouze část dat
      // Toto umožňuje postupné načítání velkých oblastí
      
      // Výpočet nových hranic pro omezenou velikost
      const aspectRatio = (endX - startX) / (endY - startY);
      let newWidth, newHeight;
      
      if (aspectRatio >= 1) {
        // Širší než vyšší
        newWidth = Math.floor(Math.sqrt(maxChunkSize * aspectRatio));
        newHeight = Math.floor(newWidth / aspectRatio);
      } else {
        // Vyšší než širší
        newHeight = Math.floor(Math.sqrt(maxChunkSize / aspectRatio));
        newWidth = Math.floor(newHeight * aspectRatio);
      }
      
      // Omezení na původní velikost
      newWidth = Math.min(newWidth, endX - startX);
      newHeight = Math.min(newHeight, endY - startY);
      
      // Použití nových hranic
      const newEndX = startX + newWidth;
      const newEndY = startY + newHeight;
      
      // Získání pixelů v omezeném rozsahu
      const pixelsArray = await getPixelsInRange(startX, newEndX, startY, newEndY);
      
      // Převedení pole pixelů na mapu pro snadnější použití na frontendu
      const pixelMap: Record<string, { color: string; owner?: string; url?: string; message?: string }> = {};
      for (const pixel of pixelsArray) {
        const key = `${pixel.x},${pixel.y}`;
        pixelMap[key] = {
          color: pixel.color,
          owner: pixel.owner_id,
          url: pixel.url,
          message: pixel.message
        };
      }
      
      return NextResponse.json({
        pixels: pixelMap,
        truncated: true,
        originalRequest: { startX, endX, startY, endY },
        actualRequest: { startX, endX: newEndX, startY, endY: newEndY }
      });
    }

    // Získání pixelů v daném rozsahu z databáze
    const pixelsArray = await getPixelsInRange(startX, endX, startY, endY);
    
    // Převedení pole pixelů na mapu pro snadnější použití na frontendu
    const pixelMap: Record<string, { color: string; owner?: string; url?: string; message?: string }> = {};
    for (const pixel of pixelsArray) {
      const key = `${pixel.x},${pixel.y}`;
      pixelMap[key] = {
        color: pixel.color,
        owner: pixel.owner_id,
        url: pixel.url,
        message: pixel.message
      };
    }

    return NextResponse.json({ pixels: pixelMap });
  } catch (error) {
    console.error('Chyba při získávání pixelů:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při získávání dat o pixelech' },
      { status: 500 }
    );
  }
}
