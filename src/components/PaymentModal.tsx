'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePixelStore } from '../lib/store';
import { getHostedCheckoutUrl } from '../lib/opennode';
import { useRouter } from 'next/navigation';

export default function PaymentModal() {
  const { paymentModalOpen, setPaymentModalOpen, invoiceData, clearSelection } = usePixelStore();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired' | 'error'>('pending');
  const [showLightningInvoice, setShowLightningInvoice] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const lightningInvoiceRef = useRef<HTMLTextAreaElement>(null);
  
  // Zavření modálního okna
  const handleClose = async () => {
    // Pokud máme ID faktury a stav platby není úspěšný, zrušíme rezervaci pixelů
    if (invoiceData?.chargeId && paymentStatus !== 'success') {
      try {
        // Zavoláme API pro zrušení rezervace pixelů
        await fetch(`/api/payments/cancel?chargeId=${invoiceData.chargeId}`, {
          method: 'POST'
        });
        console.log('Rezervace pixelů byla zrušena');
      } catch (error) {
        console.error('Chyba při rušení rezervace pixelů:', error);
      }
    }
    
    setPaymentModalOpen(false);
    clearSelection();
  };
  
  // Přesměrování na OpenNode checkout
  const handleProceedToCheckout = () => {
    if (invoiceData?.hostedCheckoutUrl) {
      // Otevřeme v tom samém okně, aby přesměrování fungovalo správně
      window.location.href = invoiceData.hostedCheckoutUrl;
    } else if (invoiceData?.chargeId) {
      // Pokud máme jen ID, vytvoříme URL pomocí utility funkce
      const checkoutUrl = getHostedCheckoutUrl(invoiceData.chargeId, { defaultLightning: true });
      window.location.href = checkoutUrl;
    }
  };
  
  // Kopírování Lightning Network invoice do schránky
  const copyLightningInvoice = () => {
    if (lightningInvoiceRef.current && invoiceData?.lightning_invoice) {
      lightningInvoiceRef.current.select();
      document.execCommand('copy');
      setCopySuccess(true);
      
      // Reset copy success message after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    }
  };
  
  const router = useRouter();
  
  // Funkce pro kontrolu stavu platby
  const checkPaymentStatus = useCallback(async (chargeId: string) => {
    try {
      const response = await fetch(`/api/payments/status?chargeId=${chargeId}`);
      if (!response.ok) {
        throw new Error('Nepodařilo se získat stav platby');
      }
      
      const data = await response.json();
      
      if (data.status === 'paid' || data.status === 'completed') {
        setPaymentStatus('success');
        
        // Počkáme 3 sekundy a pak přesměrujeme uživatele zpět na hlavní stránku
        setTimeout(() => {
          setPaymentModalOpen(false);
          clearSelection();
          
          // Přesměrování na hlavní stránku s informací o úspěšném nákupu
          router.push(`/?payment=success&chargeId=${encodeURIComponent(chargeId)}`);
        }, 3000);
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
      }
      
      return data.status;
    } catch (error) {
      console.error('Chyba při kontrole stavu platby:', error);
      return null;
    }
  }, [setPaymentModalOpen, clearSelection, router]);
  
  // Kontrola stavu platby
  useEffect(() => {
    if (!paymentModalOpen || !invoiceData || !invoiceData.chargeId) return;
    
    setPaymentStatus('pending');
    
    // Přidání event listeneru pro detekci návratu z OpenNode stránky
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && invoiceData?.chargeId) {
        // Uživatel se vrátil na stránku, zkontrolujeme stav platby
        const status = await checkPaymentStatus(invoiceData.chargeId);
        
        // Pokud platba není dokončená nebo zpracovávaná, předpokládáme, že uživatel zrušil platbu
        if (status !== 'paid' && status !== 'completed' && status !== 'processing') {
          // Zrušíme rezervaci pixelů
          try {
            await fetch(`/api/payments/cancel?chargeId=${invoiceData.chargeId}`, {
              method: 'POST'
            });
            console.log('Rezervace pixelů byla zrušena po návratu z platební brány');
          } catch (error) {
            console.error('Chyba při rušení rezervace pixelů:', error);
          }
        }
      }
    };
    
    // Nastavení časovače pro kontrolu vypršení platby
    let expiryTimeoutId: NodeJS.Timeout | null = null;
    
    if (invoiceData.expiresAt) {
      const expiryTime = new Date(invoiceData.expiresAt || '').getTime();
      const now = new Date().getTime();
      
      if (expiryTime > now) {
        expiryTimeoutId = setTimeout(() => {
          setPaymentStatus('expired');
        }, expiryTime - now);
      } else {
        setPaymentStatus('expired');
      }
    }
    
    // Polling mechanismus pro kontrolu stavu platby
    const pollInterval = 5000; // 5 sekund
    let pollCount = 0;
    const maxPolls = 60; // Maximálně 5 minut (60 * 5s)
    let pollTimeoutId: NodeJS.Timeout | null = null;
    
    const pollPaymentStatus = async () => {
      if (pollCount >= maxPolls) return;
      
      const status = await checkPaymentStatus(invoiceData.chargeId!);
      
      // Pokud je platba úspěšná nebo vypršela, ukončíme polling
      if (status === 'paid' || status === 'completed' || status === 'expired') {
        return;
      }
      
      // Pokračujeme v pollingu
      pollCount++;
      pollTimeoutId = setTimeout(pollPaymentStatus, pollInterval);
    };
    
    // Spustíme polling
    pollPaymentStatus();
    
    // Přidáme event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (expiryTimeoutId) {
        clearTimeout(expiryTimeoutId);
      }
      
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
    
  }, [paymentModalOpen, invoiceData, checkPaymentStatus]);
  
  if (!paymentModalOpen || !invoiceData) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Pixel Purchase</h2>
        
        {/* Stav platby */}
        <div className="mb-4">
          {paymentStatus === 'pending' && (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              <p className="font-bold">Waiting for payment</p>
              <p>Click the button below to be redirected to the payment gateway.</p>
              
              <button
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setShowLightningInvoice(!showLightningInvoice)}
              >
                {showLightningInvoice ? 'Hide Lightning invoice' : 'Show Lightning invoice'}
              </button>
              
              {showLightningInvoice && invoiceData.lightning_invoice && (
                <div className="mt-3 p-3 bg-gray-100 rounded border border-gray-300">
                  <p className="font-bold text-sm mb-1">Lightning Network Invoice:</p>
                  <div className="relative">
                    <textarea
                      ref={lightningInvoiceRef}
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded h-24 font-mono"
                      value={invoiceData.lightning_invoice}
                      readOnly
                    />
                    <button
                      className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
                      onClick={copyLightningInvoice}
                    >
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs mt-2">
                    Copy this invoice and paste it into your Lightning wallet to pay.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="bg-green-100 text-green-700 p-3 rounded">
              <p className="font-bold">Purchase completed!</p>
              <p>Your pixels have been successfully purchased.</p>
              <p className="mt-2">You will be redirected back to the main page...</p>
            </div>
          )}
          
          {paymentStatus === 'expired' && (
            <div className="bg-yellow-100 text-yellow-700 p-3 rounded">
              <p className="font-bold">Payment expired</p>
              <p>The payment time has expired. Please try again.</p>
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="bg-red-100 text-red-700 p-3 rounded">
              <p className="font-bold">Payment error</p>
              <p>An error occurred while processing the payment. Please try again.</p>
            </div>
          )}
        </div>
        
        {/* Informace o nákupu */}
        <div className="mb-4">
          <p className="mb-1">
            <span className="font-semibold">Number of pixels:</span> {invoiceData.pixelCount}
          </p>
          <p className="mb-1">
            <span className="font-semibold">Amount:</span> {invoiceData.amount} satoshi
          </p>
          {invoiceData.expiresAt && (
            <p className="mb-1">
            <span className="font-semibold">Valid until:</span>{' '}
            {new Date(invoiceData.expiresAt).toLocaleString('en-US')}
            </p>
          )}
        </div>
        
        {/* Tlačítka */}
        <div className="flex flex-col gap-2">
          {paymentStatus === 'pending' && (
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg text-lg font-medium"
              onClick={handleProceedToCheckout}
            >
              Proceed to payment
            </button>
          )}
          
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            onClick={handleClose}
          >
            {paymentStatus === 'pending' ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
