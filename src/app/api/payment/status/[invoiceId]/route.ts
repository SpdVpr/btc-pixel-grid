import { NextRequest, NextResponse } from 'next/server';
import { getCharge } from '@/lib/opennode';
import { pixelReservations } from '../../../pixels/select/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    // Získání aktuálního stavu faktury z OpenNode API
    const charge = await getCharge(invoiceId);
    
    // Kontrola, zda faktura nevypršela
    const now = new Date();
    
    // Kontrola rezervací pro tuto fakturu a případné uvolnění vypršelých rezervací
    for (const [key, reservation] of Object.entries(pixelReservations)) {
      if (reservation.invoiceId === invoiceId) {
        if (reservation.expiresAt < now || charge.status === 'expired') {
          // Faktura vypršela, uvolníme rezervaci
          delete pixelReservations[key];
        }
      }
    }

    // Transformace odpovědi do formátu, který očekává frontend
    const paymentStatus = {
      invoiceId,
      status: charge.status,
      amount: charge.amount,
      pixelCount: charge.amount, // Předpokládáme, že 1 satoshi = 1 pixel
      created_at: new Date(charge.created_at * 1000).toISOString(),
      completed_at: charge.status === 'paid' ? new Date().toISOString() : null,
      lightning_invoice: charge.lightning_invoice.payreq,
      expires_at: new Date(charge.lightning_invoice.expires_at * 1000).toISOString(),
    };

    // Vrácení aktuálního stavu
    return NextResponse.json(paymentStatus);
  } catch (error) {
    console.error('Chyba při kontrole stavu platby:', error);
    
    // Pokud se nepodařilo získat stav z OpenNode, zkontrolujeme alespoň lokální rezervace
    try {
      const now = new Date();
      let hasExpired = false;
      
      // Kontrola rezervací pro tuto fakturu
      for (const [key, reservation] of Object.entries(pixelReservations)) {
        if (reservation.invoiceId === params.invoiceId) {
          if (reservation.expiresAt < now) {
            // Faktura vypršela, uvolníme rezervaci
            delete pixelReservations[key];
            hasExpired = true;
          }
        }
      }
      
      // Vrátíme alespoň základní informace
      return NextResponse.json({
        invoiceId: params.invoiceId,
        status: hasExpired ? 'expired' : 'pending',
        amount: 0,
        pixelCount: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
        lightning_invoice: '',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Nastala chyba při kontrole stavu platby' },
        { status: 500 }
      );
    }
  }
}