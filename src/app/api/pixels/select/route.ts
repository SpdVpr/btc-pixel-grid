import { NextRequest, NextResponse } from 'next/server';
import { mockGetPixelsInRange } from '@/lib/db/mock';
import { createCharge } from '@/lib/opennode';

// Globální úložiště pro rezervace pixelů
// V produkční aplikaci by toto bylo v databázi
export const pixelReservations: Record<string, { invoiceId: string; expiresAt: Date }> = {};

export async function POST(request: NextRequest) {
  try {
    // Získání dat z požadavku
    const body = await request.json();
    const { pixels } = body;

    // Validace dat
    if (!Array.isArray(pixels) || pixels.length === 0) {
      return NextResponse.json(
        { error: 'Neplatný formát dat. Očekává se pole pixelů.' },
        { status: 400 }
      );
    }

    // Maximální počet pixelů v jednom nákupu
    const maxPixels = 20000000; // Zvýšeno na 20 milionů podle požadavku
    if (pixels.length > maxPixels) {
      return NextResponse.json(
        { error: `Příliš mnoho pixelů. Maximální počet je ${maxPixels}.` },
        { status: 400 }
      );
    }

    // Validace jednotlivých pixelů
    for (const pixel of pixels) {
      // Kontrola, zda pixel má všechny potřebné vlastnosti
      if (
        typeof pixel.x !== 'number' ||
        typeof pixel.y !== 'number' ||
        typeof pixel.color !== 'string' ||
        !/^#[0-9A-Fa-f]{6}$/.test(pixel.color)
      ) {
        return NextResponse.json(
          { error: 'Neplatný formát pixelu. Očekává se {x: number, y: number, color: string}.' },
          { status: 400 }
        );
      }

      // Kontrola rozsahu souřadnic (0-9999)
      if (pixel.x < 0 || pixel.x > 9999 || pixel.y < 0 || pixel.y > 9999) {
        return NextResponse.json(
          { error: 'Souřadnice pixelu musí být v rozsahu 0-9999.' },
          { status: 400 }
        );
      }
    }

    // Kontrola, zda jsou pixely dostupné (nejsou již vlastněny nebo rezervovány)
    const unavailablePixels = [];
    
    // Získání všech souřadnic pixelů pro kontrolu
    const minX = Math.min(...pixels.map(p => p.x));
    const maxX = Math.max(...pixels.map(p => p.x));
    const minY = Math.min(...pixels.map(p => p.y));
    const maxY = Math.max(...pixels.map(p => p.y));
    
    // Získání existujících pixelů v daném rozsahu
    const existingPixels = await mockGetPixelsInRange(minX, maxX, minY, maxY);
    
    // Kontrola každého pixelu
    for (const pixel of pixels) {
      const key = `${pixel.x},${pixel.y}`;
      
      // Kontrola, zda pixel již existuje v databázi
      if (existingPixels[key] && existingPixels[key].owner) {
        unavailablePixels.push(key);
        continue;
      }
    }
    
    // Pokud jsou některé pixely nedostupné, vrátíme chybu
    if (unavailablePixels.length > 0) {
      return NextResponse.json(
        {
          error: 'Některé pixely jsou již obsazeny.',
          unavailablePixels
        },
        { status: 409 }
      );
    }

    // Vytvoření OpenNode platby
    const amount = pixels.length; // 1 satoshi za pixel
    const orderId = `pixels-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      // Vytvoření charge pomocí OpenNode API - zjednodušený payload podle úspěšného testu
      const charge = await createCharge({
        amount: amount.toString(), // Převedeme na string, jak to očekává API
        currency: 'BTC', // Použijeme BTC jako měnu (amount je v satoshi)
        description: `Nákup ${amount} pixelů na BTC Pixel Grid`,
        order_id: orderId
      });
      
      // Vrácení informací o platbě
      return NextResponse.json({
        success: true,
        message: `Vytvořena platba pro ${amount} pixelů.`,
        pixelCount: amount,
        chargeId: charge.id,
        hostedCheckoutUrl: charge.hosted_checkout_url,
        lightningInvoice: charge.lightning_invoice,
        expiresAt: charge.lightning_invoice 
          ? new Date(charge.lightning_invoice.expires_at * 1000).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString() // Fallback: 1 hour from now
      });
    } catch (error) {
      console.error('Chyba při vytváření OpenNode platby:', error);
      
      return NextResponse.json(
        { error: 'Nastala chyba při vytváření platby. Zkuste to prosím znovu.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chyba při vytváření faktury:', error);
    
    // Podrobnější logování chyby
    if (error instanceof Error) {
      console.error('Typ chyby:', error.name);
      console.error('Zpráva chyby:', error.message);
      console.error('Stack trace:', error.stack);
      
      return NextResponse.json(
        {
          error: 'Nastala chyba při zpracování požadavku',
          message: error.message,
          type: error.name
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Nastala chyba při zpracování požadavku' },
      { status: 500 }
    );
  }
}
