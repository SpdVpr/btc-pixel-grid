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
    setIsLoading
  } = useStatisticsStore();
  
  // Načtení statistik při prvním renderování
  useEffect(() => {
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
    
    fetchStatistics();
    
    // Aktualizace statistik každou minutu
    const interval = setInterval(fetchStatistics, 60000);
    
    return () => clearInterval(interval);
  }, [setStatistics, setIsLoading]);
  
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
  
  return (
    <div className="p-4 rounded h-full">
      <h2 className="text-lg font-bold mb-4 text-black">Statistiky projektu</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <p className="text-black">Načítání statistik...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-blue-800 p-4 rounded-lg border border-blue-600">
              <p className="text-sm text-black font-medium">Zabraných pixelů</p>
              <p className="text-2xl font-bold text-black">{totalPixelsSold.toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-black">{percentageSold}% z celkových 100M</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <p className="text-sm text-black font-medium">Volných pixelů</p>
              <p className="text-2xl font-bold text-black">{(100000000 - totalPixelsSold).toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-black">{(100 - Number(percentageSold)).toFixed(6)}% z celkových 100M</p>
            </div>
          </div>
          
          {/* Vizuální progress bar */}
          <div className="mt-6">
            <p className="text-sm text-black font-medium mb-2">Celkový průběh</p>
            <div className="w-full bg-gray-600 rounded-full h-6">
              <div
                className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-black text-xs font-bold"
                style={{ width: `${Math.max(5, Number(percentageSold))}%` }}
              >
                {percentageSold}%
              </div>
            </div>
          </div>
          
          {/* Poslední transakce - přidáno pro lepší využití prostoru */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="font-bold mb-2 text-black">Poslední aktualizace</h3>
            <p className="text-sm text-black font-medium">
              {formatDate(lastUpdated)}
            </p>
          </div>
          
          {/* Další informace - přidáno pro lepší využití prostoru */}
          <div className="mt-6 bg-yellow-800 p-4 rounded-lg border border-yellow-600">
            <h3 className="font-bold mb-2 text-black">Bitcoin info</h3>
            <p className="text-sm mb-1 text-black">1 BTC = 100 000 000 satoshi</p>
            <p className="text-sm mb-1 text-black">1 satoshi = 0.00000001 BTC</p>
          </div>
        </div>
      )}
    </div>
  );
}
