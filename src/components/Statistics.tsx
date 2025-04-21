'use client';

import { useEffect, useState } from 'react';
import { useStatisticsStore } from '../lib/store';
import axios from 'axios';

export default function Statistics() {
  const {
    totalPixelsSold,
    totalSatoshisCollected,
    percentageSold,
    percentageCollected,
    lastUpdated,
    isLoading,
    setStatistics,
    setIsLoading,
    bitcoinPrice,
    bitcoinPriceLastUpdated,
    setBitcoinPrice
  } = useStatisticsStore();
  
  // Funkce pro načtení statistik
  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Chyba při načítání statistik:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Načtení statistik při prvním renderování
  useEffect(() => {
    fetchStatistics();
    
    // Aktualizace statistik každou minutu
    const interval = setInterval(fetchStatistics, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Načtení ceny Bitcoinu
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      try {
        const response = await axios.get('/api/bitcoin-price');
        if (response.data && response.data.price) {
          setBitcoinPrice(response.data.price, response.data.lastUpdated);
        }
      } catch (error) {
        console.error('Chyba při načítání ceny Bitcoinu:', error);
      }
    };
    
    fetchBitcoinPrice();
    
    // Aktualizace ceny každých 5 minut
    const interval = setInterval(fetchBitcoinPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [setBitcoinPrice]);
  
  // Formátování data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nikdy';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };
  
  // Funkce pro resetování databáze
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetDatabase = async () => {
    if (window.confirm('Opravdu chcete resetovat databázi? Tato akce je nevratná!')) {
      try {
        setIsResetting(true);
        setResetMessage(null);
        
        const response = await axios.post('/api/reset-db');
        
        if (response.data.success) {
          setResetMessage(`Databáze byla úspěšně resetována. Přidáno ${response.data.pixelsAdded} testovacích pixelů.`);
          // Aktualizace statistik
          fetchStatistics();
        } else {
          setResetMessage('Chyba při resetování databáze.');
        }
      } catch (error) {
        console.error('Chyba při resetování databáze:', error);
        setResetMessage('Chyba při resetování databáze.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="p-4 rounded h-full">
      <h2 className="text-lg font-bold mb-4 text-white">Statistiky projektu</h2>
      
      {/* Admin tlačítko pro reset databáze */}
      <div className="mb-4 bg-red-800 p-2 rounded-lg border border-red-600">
        <button
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          onClick={handleResetDatabase}
          disabled={isResetting}
        >
          {isResetting ? 'Resetování...' : 'Resetovat databázi'}
        </button>
        {resetMessage && (
          <p className="mt-2 text-sm text-white">{resetMessage}</p>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <p className="text-white">Načítání statistik...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-blue-800 p-4 rounded-lg border border-blue-600">
              <p className="text-sm text-white font-medium">Zabraných pixelů</p>
              <p className="text-2xl font-bold text-white">{totalPixelsSold.toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-white">{percentageSold}% z celkových 100M</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <p className="text-sm text-white font-medium">Volných pixelů</p>
              <p className="text-2xl font-bold text-white">{(100000000 - totalPixelsSold).toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-white">{(100 - Number(percentageSold)).toFixed(6)}% z celkových 100M</p>
            </div>
          </div>
          
          {/* Vizuální progress bar */}
          <div className="mt-6">
            <p className="text-sm text-white font-medium mb-2">Celkový průběh</p>
            <div className="w-full bg-gray-600 rounded-full h-6">
              <div
                className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${Math.max(5, Number(percentageSold))}%` }}
              >
                {percentageSold}%
              </div>
            </div>
          </div>
          
          {/* Poslední transakce - přidáno pro lepší využití prostoru */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="font-bold mb-2 text-white">Poslední aktualizace</h3>
            <p className="text-sm text-white font-medium">
              {formatDate(lastUpdated)}
            </p>
          </div>
          
          {/* Další informace - přidáno pro lepší využití prostoru */}
          <div className="mt-6 bg-yellow-800 p-4 rounded-lg border border-yellow-600">
            <h3 className="font-bold mb-2 text-white">Bitcoin info</h3>
            <p className="text-sm mb-1 text-white">1 BTC = 100 000 000 satoshi</p>
            <p className="text-sm mb-1 text-white">1 satoshi = 0.00000001 BTC</p>
            {bitcoinPrice > 0 && (
              <>
                <p className="text-sm mb-1 text-white">1 BTC = ${bitcoinPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</p>
                <p className="text-sm mb-1 text-white">1 satoshi = ${(bitcoinPrice / 100000000).toFixed(8)} USD</p>
                <p className="text-xs text-white opacity-75 mt-2">
                  Poslední aktualizace ceny: {bitcoinPriceLastUpdated ? new Date(bitcoinPriceLastUpdated).toLocaleString('cs-CZ') : 'Nikdy'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
