import { NextRequest, NextResponse } from 'next/server';
import { mockGetPixelsInRange } from '@/lib/db/mock';

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
      const pixelMap = await mockGetPixelsInRange(startX, newEndX, startY, newEndY);
      
      return NextResponse.json({
        pixels: pixelMap,
        truncated: true,
        originalRequest: { startX, endX, startY, endY },
        actualRequest: { startX, endX: newEndX, startY, endY: newEndY }
      });
    }

    // Získání pixelů v daném rozsahu z mock dat
    const pixelMap = await mockGetPixelsInRange(startX, endX, startY, endY);

    return NextResponse.json({ pixels: pixelMap });
  } catch (error) {
    console.error('Chyba při získávání pixelů:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při získávání dat o pixelech' },
      { status: 500 }
    );
  }
}