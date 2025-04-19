import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, processWebhookNotification } from '@/lib/opennode';

// Přístup k rezervacím pixelů (v produkci by toto bylo v databázi)
// Musíme importovat z route.ts souboru, kde jsou rezervace definovány
import { pixelReservations } from '../../pixels/select/route';

export async function POST(request: NextRequest) {
  try {
    // Získání dat z požadavku
    const body = await request.text();
    const signature = request.headers.get('X-OpenNode-Signature') || '';

    // Ověření podpisu
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Neplatný webhook podpis');
      return NextResponse.json(
        { error: 'Neplatný webhook podpis' },
        { status: 401 }
      );
    }

    // Parsování dat
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Chyba při parsování JSON:', e);
      return NextResponse.json(
        { error: 'Neplatný JSON formát' },
        { status: 400 }
      );
    }

    // Zpracování notifikace o platbě
    const { invoiceId, status } = processWebhookNotification(data);
    console.log(`Přijata webhook notifikace pro fakturu ${invoiceId}, status: ${status}`);

    // OpenNode může poslat různé stavy, ale nás zajímá hlavně 'paid'
    if (status === 'paid' || status === 'processing') {
      // Platba byla úspěšná nebo se zpracovává, aktualizujeme vlastnictví pixelů
      
      // Najdeme všechny pixely rezervované pro tuto fakturu
      const paidPixels = [];
      for (const [key, reservation] of Object.entries(pixelReservations)) {
        if (reservation.invoiceId === invoiceId) {
          paidPixels.push(key);
          
          // V produkční aplikaci bychom zde aktualizovali databázi
          // Pro demo účely pouze odstraníme rezervaci
          delete pixelReservations[key];
        }
      }
      
      console.log(`Platba ${status} pro fakturu ${invoiceId}, aktualizováno ${paidPixels.length} pixelů`);
    } else if (status === 'expired') {
      // Platba vypršela, uvolníme rezervace
      let expiredCount = 0;
      for (const [key, reservation] of Object.entries(pixelReservations)) {
        if (reservation.invoiceId === invoiceId) {
          delete pixelReservations[key];
          expiredCount++;
        }
      }
      
      console.log(`Platba vypršela pro fakturu ${invoiceId}, uvolněno ${expiredCount} pixelů`);
    }

    // Vrácení potvrzení
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při zpracování webhook notifikace:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při zpracování webhook notifikace' },
      { status: 500 }
    );
  }
}