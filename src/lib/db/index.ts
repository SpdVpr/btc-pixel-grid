import { sql } from '@vercel/postgres';

export async function createTables() {
  try {
    // Vytvoření tabulky pixels
    await sql`
      CREATE TABLE IF NOT EXISTS pixels (
        id SERIAL PRIMARY KEY,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color VARCHAR(7) NOT NULL,
        url TEXT,
        message TEXT,
        owner_id TEXT,
        purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        invoice_id TEXT,
        UNIQUE(x, y)
      );
    `;

    // Vytvoření tabulky transactions
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        pixel_count INTEGER NOT NULL
      );
    `;

    // Vytvoření tabulky statistics
    await sql`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        total_pixels_sold INTEGER NOT NULL DEFAULT 0,
        total_satoshis_collected INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Inicializace statistik, pokud ještě neexistují
    const stats = await sql`SELECT * FROM statistics LIMIT 1`;
    if (stats.rowCount === 0) {
      await sql`INSERT INTO statistics (total_pixels_sold, total_satoshis_collected) VALUES (0, 0)`;
    }

    console.log('Databázové tabulky byly úspěšně vytvořeny nebo již existují');
    return { success: true };
  } catch (error) {
    console.error('Chyba při vytváření databázových tabulek:', error);
    return { success: false, error };
  }
}

export default sql;