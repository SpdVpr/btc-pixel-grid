'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePixelStore } from '../lib/store';
import { getHostedCheckoutUrl } from '../lib/opennode';
import { useRouter } from 'next/navigation';

export default function PaymentModal() {
  const { paymentModalOpen, setPaymentModalOpen, invoiceData, clearSelection } = usePixelStore();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired' | 'error'>('pending');
  
  // Zavření modálního okna
  const handleClose = () => {
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
          router.push('/?payment=success');
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
    
    // Nastavení časovače pro kontrolu vypršení platby
    if (invoiceData.expiresAt) {
      const expiryTime = new Date(invoiceData.expiresAt).getTime();
      const now = new Date().getTime();
      
      if (expiryTime > now) {
        const timeoutId = setTimeout(() => {
          setPaymentStatus('expired');
        }, expiryTime - now);
        
        return () => clearTimeout(timeoutId);
      } else {
        setPaymentStatus('expired');
      }
    }
    
    // Polling mechanismus pro kontrolu stavu platby
    const pollInterval = 5000; // 5 sekund
    let pollCount = 0;
    const maxPolls = 60; // Maximálně 5 minut (60 * 5s)
    
    const pollPaymentStatus = async () => {
      if (pollCount >= maxPolls) return;
      
      const status = await checkPaymentStatus(invoiceData.chargeId!);
      
      // Pokud je platba úspěšná nebo vypršela, ukončíme polling
      if (status === 'paid' || status === 'completed' || status === 'expired') {
        return;
      }
      
      // Pokračujeme v pollingu
      pollCount++;
      setTimeout(pollPaymentStatus, pollInterval);
    };
    
    // Spustíme polling
    pollPaymentStatus();
    
  }, [paymentModalOpen, invoiceData, checkPaymentStatus]);
  
  if (!paymentModalOpen || !invoiceData) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Nákup pixelů</h2>
        
        {/* Stav platby */}
        <div className="mb-4">
          {paymentStatus === 'pending' && (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              <p className="font-bold">Čeká se na platbu</p>
              <p>Klikněte na tlačítko níže pro přesměrování na platební bránu.</p>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="bg-green-100 text-green-700 p-3 rounded">
              <p className="font-bold">Nákup dokončen!</p>
              <p>Vaše pixely byly úspěšně zakoupeny.</p>
              <p className="mt-2">Budete přesměrováni zpět na hlavní stránku...</p>
            </div>
          )}
          
          {paymentStatus === 'expired' && (
            <div className="bg-yellow-100 text-yellow-700 p-3 rounded">
              <p className="font-bold">Platba vypršela</p>
              <p>Čas na zaplacení vypršel. Zkuste to prosím znovu.</p>
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="bg-red-100 text-red-700 p-3 rounded">
              <p className="font-bold">Chyba platby</p>
              <p>Při zpracování platby došlo k chybě. Zkuste to prosím znovu.</p>
            </div>
          )}
        </div>
        
        {/* Informace o nákupu */}
        <div className="mb-4">
          <p className="mb-1">
            <span className="font-semibold">Počet pixelů:</span> {invoiceData.pixelCount}
          </p>
          <p className="mb-1">
            <span className="font-semibold">Částka:</span> {invoiceData.amount} satoshi
          </p>
          {invoiceData.expiresAt && (
            <p className="mb-1">
              <span className="font-semibold">Platnost do:</span>{' '}
              {new Date(invoiceData.expiresAt).toLocaleString()}
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
              Přejít k platbě
            </button>
          )}
          
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            onClick={handleClose}
          >
            {paymentStatus === 'pending' ? 'Zrušit' : 'Zavřít'}
          </button>
        </div>
      </div>
    </div>
  );
}
