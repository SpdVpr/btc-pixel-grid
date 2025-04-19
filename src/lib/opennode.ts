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
// Určení, zda jsme v testovacím nebo produkčním režimu
const isTestMode = !OPENNODE_API_KEY.startsWith('prod_');
// Použití správné URL podle režimu
const OPENNODE_API_URL = isTestMode
  ? 'https://dev-api.opennode.com/v1'  // Testovací API
  : 'https://api.opennode.com/v1';     // Produkční API
const WEBHOOK_SECRET = process.env.OPENNODE_WEBHOOK_SECRET || '';

console.log(`OpenNode API v ${isTestMode ? 'testovacím' : 'produkčním'} režimu`);

// Vytvoření HTTP klienta s autorizačním hlavičkou
const openNodeClient = axios.create({
  baseURL: OPENNODE_API_URL,
  headers: {
    'Authorization': OPENNODE_API_KEY, // OpenNode očekává API klíč přímo v hlavičce
    'Content-Type': 'application/json',
  },
});

// Logování pro diagnostiku
console.log(`OpenNode API URL: ${OPENNODE_API_URL}`);
console.log(`OpenNode API Key format: ${OPENNODE_API_KEY.substring(0, 5)}...`);

// Přidání interceptoru pro logování chyb
openNodeClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('OpenNode API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('OpenNode API Error: No response received', error.request);
    } else {
      console.error('OpenNode API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

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
  // Pokud nemáme nastavený webhook secret, povolíme všechny požadavky v development módu
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'dočasný_webhook_secret') {
    console.warn('OPENNODE_WEBHOOK_SECRET není nastaven nebo je dočasný - přeskakuji ověření podpisu');
    // V development módu povolíme všechny požadavky
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    // V produkčním prostředí nepovolíme požadavky bez ověření
    console.error('OPENNODE_WEBHOOK_SECRET není nastaven v produkčním prostředí');
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