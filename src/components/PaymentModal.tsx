'use client';

import { useEffect, useState } from 'react';
import { usePixelStore } from '../lib/store';
import { getHostedCheckoutUrl } from '../lib/opennode';

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
      window.open(invoiceData.hostedCheckoutUrl, '_blank');
    } else if (invoiceData?.chargeId) {
      // Pokud máme jen ID, vytvoříme URL pomocí utility funkce
      const checkoutUrl = getHostedCheckoutUrl(invoiceData.chargeId, { defaultLightning: true });
      window.open(checkoutUrl, '_blank');
    }
  };
  
  // Kontrola stavu platby
  useEffect(() => {
    if (!paymentModalOpen || !invoiceData) return;
    
    // Zde by mohla být implementace polling mechanismu pro kontrolu stavu platby
    // Pro jednoduchost nyní předpokládáme, že platba je ve stavu pending
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
  }, [paymentModalOpen, invoiceData]);
  
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
