import axios from 'axios';

// Typy pro OpenNode API
export type OpenNodeCharge = {
  id: string;
  description: string;
  amount: number;
  status: 'unpaid' | 'processing' | 'paid' | 'expired';
  created_at: number;
  lightning_invoice: {
    expires_at: number;
    payreq: string;
  };
  success_url?: string;
  callback_url?: string;
};

export type CreateChargeParams = {
  amount: number;
  description: string;
  callback_url?: string;
  success_url?: string;
  order_id?: string;
  ttl?: number; // Time to live v sekundách (výchozí je 1 hodina)
};

// Konfigurace OpenNode API
const OPENNODE_API_KEY = process.env.OPENNODE_API_KEY || '';
const OPENNODE_API_URL = 'https://api.opennode.com/v1';
const WEBHOOK_SECRET = process.env.OPENNODE_WEBHOOK_SECRET || '';

// Vytvoření HTTP klienta s autorizačním hlavičkou
const openNodeClient = axios.create({
  baseURL: OPENNODE_API_URL,
  headers: {
    'Authorization': OPENNODE_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Vytvoření nové faktury (charge)
export async function createCharge(params: CreateChargeParams): Promise<OpenNodeCharge> {
  try {
    const response = await openNodeClient.post('/charges', params);
    return response.data.data as OpenNodeCharge;
  } catch (error) {
    console.error('Chyba při vytváření OpenNode faktury:', error);
    throw error;
  }
}

// Získání informací o faktuře podle ID
export async function getCharge(chargeId: string): Promise<OpenNodeCharge> {
  try {
    const response = await openNodeClient.get(`/charge/${chargeId}`);
    return response.data.data as OpenNodeCharge;
  } catch (error) {
    console.error('Chyba při získávání informací o OpenNode faktuře:', error);
    throw error;
  }
}

// Ověření webhook podpisu
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('OPENNODE_WEBHOOK_SECRET není nastaven');
    return false;
  }

  try {
    // Skutečné ověření podpisu pomocí crypto modulu
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const computedSignature = hmac.update(payload).digest('hex');
    
    // Porovnání vypočítaného podpisu s přijatým podpisem
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Chyba při ověřování webhook podpisu:', error);
    return false;
  }
}

// Zpracování webhook notifikace
export function processWebhookNotification(
  payload: any
): { invoiceId: string; status: 'processing' | 'paid' | 'expired' } {
  // Extrahování potřebných dat z payloadu
  const { id, status } = payload;

  return {
    invoiceId: id,
    status: status as 'processing' | 'paid' | 'expired',
  };
}