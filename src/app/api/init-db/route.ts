import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/init-db';

export async function GET() {
  try {
    const result = await initDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chyba při inicializaci databáze:', error);
    return NextResponse.json(
      { error: 'Nastala chyba při inicializaci databáze' },
      { status: 500 }
    );
  }
}