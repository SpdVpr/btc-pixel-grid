/**
 * OpenNode API Integration
 *
 * This file contains functions for interacting with the OpenNode API
 * to create charges and handle payments for Bitcoin transactions.
 */

import axios from 'axios';

// API configuration
const OPENNODE_API_URL = 'https://api.opennode.com/v1/charges';
// !! Ujisti se, že máš svůj NOVÝ a TAJNÝ klíč nastavený v .env souboru !!
// !! Klíč 3c5d... z původního dotazu je NEPLATNÝ a NEBEZPEČNÝ !!
const OPENNODE_API_KEY = process.env.OPENNODE_API_KEY;

// Types
export interface OpenNodeCharge {
  id: string;
  description: string;
  amount: number; // Částka vrácená API je v satoshi pro BTC
  status: string;
  created_at: number;
  expires_at?: number; // Přidáno pro použití v modalu
  hosted_checkout_url: string;
  order_id?: string; // Může být null/undefined
  callback_url?: string; // Může být null/undefined
  success_url?: string; // Může být null/undefined
  address?: string; // Může být null/undefined pro LN only
  lightning_invoice?: { // Může být null/undefined pro on-chain only
    expires_at: number;
    payreq: string;
  };
  // Přidáme i další potenciálně užitečná pole z dokumentace, pokud je potřebuješ
  currency: string;
  source_fiat_value?: number; // Hodnota v době vytvoření
  fiat_value?: number; // Aktuální hodnota
  chain_invoice?: { // Pro on-chain platby
      address: string;
      settled_at?: number;
  };
}

export interface CreateChargeResponse {
  data: OpenNodeCharge;
}

export interface CreateChargeOptions {
  /**
   * The amount for the charge.
   * - If currency is 'BTC', this MUST be the amount in **SATOSHIS** (integer).
   * - If currency is a fiat currency (e.g., 'USD'), this MUST be the amount in the currency's base unit (e.g., cents for USD, integer).
   */
  amount: number | string;
  description: string;
  /** The currency code ('BTC', 'USD', 'EUR', etc.). Defaults to 'USD' if not provided. */
  currency?: string;
  order_id?: string;
  customer_email?: string;
  customer_name?: string;
  callback_url?: string;
  success_url?: string;
  auto_settle?: boolean;
  /** Time-to-live in minutes for the charge (optional). Default is usually 1440 (24 hours). */
  ttl?: number;
  /** Set to true to not generate an on-chain address (Lightning Network only) */
  notif_email?: string; // Email for notifications
  // Add other options from OpenNode docs as needed
}

/**
 * Creates a new charge (payment request) via OpenNode API.
 * IMPORTANT: If currency is 'BTC', the amount must be provided in Satoshis.
 *
 * @param options - Configuration options for the charge
 * @returns The created charge data
 */
export async function createCharge(options: CreateChargeOptions): Promise<OpenNodeCharge> {
  if (!OPENNODE_API_KEY) {
    throw new Error('OpenNode API key is not configured. Please set OPENNODE_API_KEY in your environment variables.');
  }

  const currency = options.currency || 'USD'; // Default to USD if not specified
  let apiAmount: string;

  // --- Validace a příprava částky ---
  try {
    const numAmount = Number(options.amount);

    // Očekáváme kladné celé číslo (nebo string reprezentující kladné celé číslo)
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
       // Zkusíme, jestli to není string reprezentující celé číslo
       if (typeof options.amount === 'string' && /^\d+$/.test(options.amount) && parseInt(options.amount, 10) > 0) {
         apiAmount = options.amount; // Je to validní string integeru
       } else {
         throw new Error(`Amount must be a positive integer (representing Satoshis for BTC, or base units for fiat). Received: ${options.amount} (Type: ${typeof options.amount})`);
       }
    } else {
        apiAmount = options.amount.toString(); // Je to validní number integer
    }

    // Zde můžeš přidat další specifické validace, např. minimální částku pro BTC/Satoshi
    // if (currency.toUpperCase() === 'BTC' && parseInt(apiAmount, 10) < 1000) { // Příklad: min 1000 sats
    //   throw new Error('Minimum amount for BTC charge is 1000 satoshis.');
    // }

  } catch (e) {
     console.error("Error processing amount:", options.amount, e);
     throw new Error(`Invalid amount format or value: ${options.amount}. ${e instanceof Error ? e.message : ''}`);
  }
  // --- Konec validace částky ---


  // Připravíme payload pro API
  const payload = {
    ...options,
    amount: apiAmount, // Použijeme zvalidovanou a na string převedenou částku
    currency: currency,
  };

  // Logování před odesláním (pozor na citlivá data v options, pokud nějaká jsou)
  console.log(`Creating OpenNode charge (${currency}): amount=${apiAmount}, order_id=${options.order_id || 'N/A'}`);
  // console.log('Sending payload to OpenNode:', payload); // Odkomentuj opatrně pro debug

  try {
    const response = await axios.post<CreateChargeResponse>(
      OPENNODE_API_URL,
      payload,
      {
        headers: {
          'Authorization': OPENNODE_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Můžeš upravit User-Agent podle svého projektu
          'User-Agent': 'BTCPixelGrid/1.0 (TypeScript Backend)'
        },
        timeout: 25000 // 25 sekund timeout
      }
    );

    console.log('OpenNode charge created successfully:', response.data.data.id);
    // Vrátíme data z odpovědi API
    return response.data.data;

  } catch (error) {
    console.error('Error creating OpenNode charge:');

    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data, // Zde bude detail chyby od OpenNode
      });

      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || JSON.stringify(errorData) || error.message;

      // Vytvoříme informativnější chybovou hlášku
      throw new Error(`OpenNode API error (${statusCode || 'N/A'}): ${errorMessage}`);

    } else {
      // Jiný typ chyby (např. chyba v našem kódu před voláním)
      console.error('Non-Axios error:', error);
      throw new Error(`Failed to create OpenNode charge due to an unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Validates a webhook signature from OpenNode
 *
 * @param id - The charge ID from the webhook payload
 * @param hashedOrder - The hashed_order value from the webhook payload
 * @returns Boolean indicating if the signature is valid
 */
export function validateWebhookSignature(id: string, hashedOrder: string): boolean {
  if (!OPENNODE_API_KEY) {
    console.error('Cannot validate webhook: OpenNode API key is not configured');
    // V produkci by toto mělo možná házet chybu nebo vracet specifický stav
    return false;
  }
  if (!id || !hashedOrder) {
      console.error('Cannot validate webhook: Missing id or hashedOrder');
      return false;
  }

  try {
    // Zajistíme, že crypto modul je dostupný (v Node.js prostředí by měl být)
    const crypto = require('crypto');
    const calculated = crypto.createHmac('sha256', OPENNODE_API_KEY).update(id).digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(hashedOrder), Buffer.from(calculated));
    if (!isValid) {
        console.warn(`Webhook validation failed for charge ID: ${id}. Expected: ${calculated}, Received: ${hashedOrder}`);
    }
    return isValid;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

/**
 * Gets the hosted checkout URL for a charge
 * (Tato funkce vypadá funkčně a pravděpodobně nepotřebuje změnu)
 *
 * @param chargeId - The OpenNode charge ID
 * @param options - Optional parameters for the checkout URL
 * @returns The hosted checkout URL
 */
export function getHostedCheckoutUrl(
  chargeId: string,
  options?: {
    defaultLightning?: boolean;
    hideFiat?: boolean;
  }
): string {
  if (!chargeId) return ''; // Handle cases where chargeId might be missing

  let url = `https://checkout.opennode.com/${chargeId}`;
  const params = [];

  if (options?.defaultLightning) {
    params.push('ln=1');
  }
  if (options?.hideFiat) {
    params.push('hf=1');
  }

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  return url;
}