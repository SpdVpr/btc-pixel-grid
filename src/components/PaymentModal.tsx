'use client';

import { useEffect, useState } from 'react';
import { usePixelStore } from '../lib/store';
import QRCode from 'qrcode';
import axios from 'axios';

export default function PaymentModal() {
  const { paymentModalOpen, setPaymentModalOpen, invoiceData, clearSelection } = usePixelStore();
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'expired' | 'failed'>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Generování QR kódu
  useEffect(() => {
    if (invoiceData?.lightning_invoice) {
      QRCode.toDataURL(invoiceData.lightning_invoice, { width: 256 })
        .then((url: string) => {
          setQrCodeUrl(url);
        })
        .catch((err: Error) => {
          console.error('Chyba při generování QR kódu:', err);
        });
      
      // Výpočet zbývajícího času
      const expiresAt = new Date(invoiceData.expires_at).getTime();
      const now = new Date().getTime();
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));
    }
  }, [invoiceData]);
  
  // Odpočet času
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || paymentStatus !== 'pending') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus]);
  
  // Polling pro kontrolu stavu platby
  useEffect(() => {
    if (!invoiceData?.invoiceId || isPolling || paymentStatus !== 'pending') return;
    
    const checkPaymentStatus = async () => {
      try {
        setIsPolling(true);
        const response = await axios.get(`/api/payment/status/${invoiceData.invoiceId}`);
        const status = response.data.status;
        
        setPaymentStatus(status);
        
        if (status === 'pending' && timeLeft && timeLeft > 0) {
          // Pokračování v pollingu
          setTimeout(checkPaymentStatus, 3000);
        } else if (status === 'completed') {
          // Platba byla úspěšná
          clearSelection();
        }
      } catch (error) {
        console.error('Chyba při kontrole stavu platby:', error);
        setIsPolling(false);
      }
    };
    
    checkPaymentStatus();
    
    return () => {
      setIsPolling(false);
    };
  }, [invoiceData, isPolling, paymentStatus, timeLeft, clearSelection]);
  
  // Formátování zbývajícího času
  const formatTimeLeft = () => {
    if (timeLeft === null) return '--:--';
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Zavření modálního okna
  const handleClose = () => {
    setPaymentModalOpen(false);
    
    // Pokud byla platba úspěšná, vyčistíme výběr
    if (paymentStatus === 'completed') {
      clearSelection();
    }
  };
  
  if (!paymentModalOpen || !invoiceData) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Platba Lightning Network</h2>
        
        {/* Stav platby */}
        <div className="mb-4">
          {paymentStatus === 'pending' && (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              <p className="font-bold">Čekání na platbu</p>
              <p>Zbývající čas: {formatTimeLeft()}</p>
            </div>
          )}
          
          {paymentStatus === 'completed' && (
            <div className="bg-green-100 text-green-700 p-3 rounded">
              <p className="font-bold">Platba přijata!</p>
              <p>Vaše pixely byly úspěšně zakoupeny.</p>
            </div>
          )}
          
          {paymentStatus === 'expired' && (
            <div className="bg-red-100 text-red-700 p-3 rounded">
              <p className="font-bold">Platba vypršela</p>
              <p>Čas na platbu vypršel. Zkuste to prosím znovu.</p>
            </div>
          )}
          
          {paymentStatus === 'failed' && (
            <div className="bg-red-100 text-red-700 p-3 rounded">
              <p className="font-bold">Platba selhala</p>
              <p>Nastala chyba při zpracování platby. Zkuste to prosím znovu.</p>
            </div>
          )}
        </div>
        
        {/* QR kód */}
        {paymentStatus === 'pending' && qrCodeUrl && (
          <div className="flex flex-col items-center mb-4">
            <img
              src={qrCodeUrl}
              alt="Lightning Network QR kód"
              className="mb-2 border border-gray-200 rounded"
              width={256}
              height={256}
            />
            <p className="text-sm text-gray-800 font-medium mb-2">
              Naskenujte QR kód pomocí Lightning Network peněženky
            </p>
            
            <div className="w-full bg-gray-100 p-2 rounded break-all text-xs font-mono mb-2">
              {invoiceData.lightning_invoice}
            </div>
            
            <button
              className="text-blue-500 text-sm"
              onClick={() => {
                navigator.clipboard.writeText(invoiceData.lightning_invoice);
              }}
            >
              Kopírovat fakturu
            </button>
          </div>
        )}
        
        {/* Informace o platbě */}
        <div className="mb-4">
          <p className="mb-1">
            <span className="font-semibold">Počet pixelů:</span> {invoiceData.pixelCount}
          </p>
          <p className="mb-1">
            <span className="font-semibold">Částka:</span> {invoiceData.amount} satoshi
          </p>
          <p className="mb-1">
            <span className="font-semibold">ID faktury:</span>{' '}
            <span className="text-xs font-mono">{invoiceData.invoiceId}</span>
          </p>
        </div>
        
        {/* Tlačítka */}
        <div className="flex justify-end">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            onClick={handleClose}
          >
            {paymentStatus === 'completed' ? 'Zavřít' : 'Zrušit'}
          </button>
        </div>
      </div>
    </div>
  );
}