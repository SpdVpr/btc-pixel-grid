import sql from './index';

export type Transaction = {
  id: number;
  invoice_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  created_at: Date;
  completed_at?: Date;
  pixel_count: number;
};

export type TransactionInput = {
  invoice_id: string;
  amount: number;
  pixel_count: number;
};

// Vytvoření nové transakce
export async function createTransaction(data: TransactionInput): Promise<Transaction> {
  try {
    const result = await sql`
      INSERT INTO transactions (invoice_id, amount, status, pixel_count)
      VALUES (${data.invoice_id}, ${data.amount}, 'pending', ${data.pixel_count})
      RETURNING *
    `;
    
    return result.rows[0] as Transaction;
  } catch (error) {
    console.error('Chyba při vytváření transakce:', error);
    throw error;
  }
}

// Získání transakce podle ID faktury
export async function getTransactionByInvoiceId(invoiceId: string): Promise<Transaction | null> {
  try {
    const result = await sql`
      SELECT * FROM transactions WHERE invoice_id = ${invoiceId}
    `;
    
    return result.rows.length > 0 ? result.rows[0] as Transaction : null;
  } catch (error) {
    console.error('Chyba při získávání transakce:', error);
    throw error;
  }
}

// Aktualizace stavu transakce
export async function updateTransactionStatus(
  invoiceId: string, 
  status: 'pending' | 'completed' | 'expired' | 'failed'
): Promise<Transaction | null> {
  try {
    const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : null;
    
    let query;
    if (status === 'completed') {
      query = sql`
        UPDATE transactions
        SET status = ${status},
            completed_at = CURRENT_TIMESTAMP
        WHERE invoice_id = ${invoiceId}
        RETURNING *
      `;
    } else {
      query = sql`
        UPDATE transactions
        SET status = ${status},
            completed_at = NULL
        WHERE invoice_id = ${invoiceId}
        RETURNING *
      `;
    }
    
    const result = await query;
    
    return result.rows.length > 0 ? result.rows[0] as Transaction : null;
  } catch (error) {
    console.error('Chyba při aktualizaci stavu transakce:', error);
    throw error;
  }
}

// Získání všech transakcí
export async function getAllTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  try {
    const result = await sql`
      SELECT * FROM transactions
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return result.rows as Transaction[];
  } catch (error) {
    console.error('Chyba při získávání všech transakcí:', error);
    throw error;
  }
}

// Získání celkové částky ze všech dokončených transakcí
export async function getTotalAmountCollected(): Promise<number> {
  try {
    const result = await sql`
      SELECT SUM(amount) as total FROM transactions WHERE status = 'completed'
    `;
    
    return parseInt(result.rows[0].total || '0', 10);
  } catch (error) {
    console.error('Chyba při získávání celkové částky:', error);
    throw error;
  }
}

// Získání počtu dokončených transakcí
export async function getCompletedTransactionsCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM transactions WHERE status = 'completed'
    `;
    
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Chyba při získávání počtu dokončených transakcí:', error);
    throw error;
  }
}