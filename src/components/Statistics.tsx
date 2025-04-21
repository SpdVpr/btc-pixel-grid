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
  
  // Date formatting
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
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
      <h2 className="text-lg font-bold mb-4 text-white">Project Statistics</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <p className="text-white">Loading statistics...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-blue-800 p-4 rounded-lg border border-blue-600">
              <p className="text-sm text-white font-medium">Occupied pixels</p>
              <p className="text-2xl font-bold text-white">{totalPixelsSold.toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-white">{percentageSold}% of total 100M</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
              <p className="text-sm text-white font-medium">Available pixels</p>
              <p className="text-2xl font-bold text-white">{(100000000 - totalPixelsSold).toLocaleString('cs-CZ')}</p>
              <p className="text-sm text-white">{(100 - Number(percentageSold)).toFixed(6)}% of total 100M</p>
            </div>
          </div>
          
          {/* Vizuální progress bar */}
          <div className="mt-6">
            <p className="text-sm text-white font-medium mb-2">Overall progress</p>
            <div className="w-full bg-gray-600 rounded-full h-6">
              <div
                className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${Math.max(5, Number(percentageSold))}%` }}
              >
                {percentageSold}%
              </div>
            </div>
          </div>
          
          {/* Last transaction - added for better space utilization */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="font-bold mb-2 text-white">Last update</h3>
            <p className="text-sm text-white font-medium">
              {formatDate(lastUpdated)}
            </p>
          </div>
          
          {/* Additional information - added for better space utilization */}
          <div className="mt-6 bg-yellow-800 p-4 rounded-lg border border-yellow-600">
            <h3 className="font-bold mb-2 text-white">Bitcoin info</h3>
            <p className="text-sm mb-1 text-white">1 BTC = 100 000 000 satoshi</p>
            <p className="text-sm mb-1 text-white">1 satoshi = 0.00000001 BTC</p>
            {bitcoinPrice > 0 && (
              <>
                <p className="text-sm mb-1 text-white">1 BTC = ${bitcoinPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</p>
                <p className="text-sm mb-1 text-white">1 satoshi = ${(bitcoinPrice / 100000000).toFixed(8)} USD</p>
                <p className="text-xs text-white opacity-75 mt-2">
                  Last price update: {bitcoinPriceLastUpdated ? new Date(bitcoinPriceLastUpdated).toLocaleString('en-US') : 'Never'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
