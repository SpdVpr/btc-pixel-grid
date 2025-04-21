'use client';

import PixelGrid from '../components/PixelGrid';
import ControlPanel from '../components/ControlPanel';
import Statistics from '../components/Statistics';
import PaymentModal from '../components/PaymentModal';
import PaymentSuccessMessage from '../components/PaymentSuccessMessage';
import { Suspense, useState } from 'react';

export default function Home() {
  const [isStatsMenuOpen, setIsStatsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hlavička */}
      <header className="bg-[#f2a900] text-white p-4 text-center shadow">
        <h1 className="text-2xl font-bold">Satoshi Pixel Grid</h1>
        <p>1 BTC = 100 000 000 pixelů, 1 satoshi = 1 pixel</p>
      </header>
      
      {/* Statistiky jsou nyní pouze v bočním menu na mobilních zařízeních */}
      
      {/* Hlavní obsah - třísloupečkový layout */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Levý panel - ovládací prvky */}
        <div className="md:w-52 lg:w-60 md:h-full md:fixed md:left-0 md:top-[73px] md:bottom-0 md:overflow-y-auto bg-gray-700 text-white md:shadow-md p-1 z-10">
          <ControlPanel />
        </div>
        
        {/* Hlavní obsah - grid */}
        <div className="flex-grow md:ml-52 lg:ml-60 md:mr-52 lg:mr-60 flex flex-col">
          {/* Statistiky nahoře - viditelné pouze na větších obrazovkách */}
          <div className="hidden md:block p-1">
            <div className="stats bg-gray-700 text-white p-1 rounded shadow mb-1 flex justify-between text-xs">
              <div>
                <strong>Obsazeno:</strong>
                <span id="pixels-owned">0</span> / 100 000 000 pixelů
              </div>
              <div>
                <strong>Aktuální cena:</strong>
                <span id="current-price">1</span> sat/pixel
              </div>
            </div>
          </div>
          
          {/* Grid zabírá celou dostupnou výšku */}
          <div className="grid-container bg-white rounded shadow mx-1 flex-grow">
            <PixelGrid />
          </div>
          
          {/* Informace o projektu - viditelné pouze na větších obrazovkách */}
          <div className="hidden md:block p-1 mt-1">
            <div className="bg-gray-700 text-white rounded shadow p-2 text-xs">
              <h2 className="font-bold mb-1">O projektu Satoshi Pixel Grid</h2>
              <p className="mb-1">
                Vítejte v projektu Satoshi Pixel Grid! Tato webová aplikace umožňuje nakupovat pixely
                pomocí Lightning Network plateb. Každý pixel stojí 1 satoshi (0.00000001 BTC).
              </p>
              <p>
                Celkem je k dispozici 100 000 000 pixelů, což odpovídá přesně 1 BTC.
              </p>
            </div>
          </div>
        </div>
        
        {/* Pravý panel - statistiky */}
        <div className="md:w-52 lg:w-60 md:h-full md:fixed md:right-0 md:top-[73px] md:bottom-0 md:overflow-y-auto bg-gray-700 text-white md:shadow-md p-1 z-10">
          <Statistics />
        </div>
      </div>
      
      {/* Mobilní ovládací panel - připnutý ke spodní hraně */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-700 text-white shadow-md p-1 z-10">
        <ControlPanel />
      </div>
      
      {/* Tlačítko pro otevření statistik - pouze na mobilních zařízeních */}
      <button 
        className="md:hidden fixed top-16 right-2 bg-gray-700 text-white p-2 rounded-full shadow-md z-20"
        onClick={() => setIsStatsMenuOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      
      {/* Vysuvné menu se statistikami - pouze na mobilních zařízeních */}
      <div className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isStatsMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute right-0 top-0 bottom-0 w-4/5 max-w-xs bg-gray-800 transform transition-transform duration-300 ${isStatsMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <button 
            className="absolute top-2 right-2 text-white p-2"
            onClick={() => setIsStatsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-4 overflow-y-auto h-full">
            <Statistics />
          </div>
        </div>
      </div>
      
      {/* Modální okno pro platbu */}
      <PaymentModal />
      
      {/* Zpráva o úspěšné platbě */}
      <Suspense fallback={null}>
        <PaymentSuccessMessage />
      </Suspense>
    </div>
  );
}
