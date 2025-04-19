import { NextRequest, NextResponse } from 'next/server';
import { createCharge } from '@/lib/opennode';

export async function POST(request: NextRequest) {
  try {
    // Získání dat z požadavku
    const body = await request.json();
    const { amount, description } = body;

    // Validace dat
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Neplatná částka. Musí být kladné číslo.' },
        { status: 400 }
      );
    }

    if (typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json(
        { error: 'Neplatný popis. Musí být neprázdný řetězec.' },
        { status: 400 }
      );
    }

    // Nastavení callback URL pro webhook notifikace
    // Použijeme URL, kterou jste nastavili v OpenNode dashboardu
    const callbackUrl = 'https://www.satoshpixelgrid.com/api/payment/webhook';

    // Vytvoření faktury pomocí OpenNode API
    const charge = await createCharge({
      amount,
      description,
      callback_url: callbackUrl,
      // Nastavení TTL (time to live) na 10 minut (600 sekund)
      ttl: 600
    });

    // Transformace odpovědi do formátu, který očekává frontend
    const invoiceData = {
      invoiceId: charge.id,
      amount,
      lightning_invoice: charge.lightning_invoice.payreq,
      expires_at: new Date(charge.lightning_invoice.expires_at * 1000).toISOString(),
      pixelCount: amount, // Předpokládáme, že 1 satoshi = 1 pixel
    };

    // Vrácení informací o faktuře
    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Chyba při vytváření faktury:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při zpracování požadavku' },
      { status: 500 }
    );
  }
}