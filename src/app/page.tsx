'use client';

import PixelGrid from '../components/PixelGrid';
import ControlPanel from '../components/ControlPanel';
import Statistics from '../components/Statistics';
import PaymentModal from '../components/PaymentModal';
import PaymentSuccessMessage from '../components/PaymentSuccessMessage';
import { Suspense, useState, useEffect } from 'react';

export default function Home() {
  const [isStatsMenuOpen, setIsStatsMenuOpen] = useState(false);
  const [isAboutMenuOpen, setIsAboutMenuOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
  const [isTabletView, setIsTabletView] = useState(false);
  
  // Check if we're in tablet view (less than 1920px width)
  useEffect(() => {
    const checkTabletView = () => {
      setIsTabletView(window.innerWidth < 1920);
    };
    
    // Initial check
    checkTabletView();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkTabletView);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkTabletView);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#f2a900] text-white p-4 text-center shadow z-20">
        <h1 className="text-2xl font-bold">Satoshi Pixel Grid</h1>
        <p>1 BTC = 100,000,000 pixels, 1 satoshi = 1 pixel</p>
      </header>
      
      {/* Statistics are now only in the side menu on mobile devices */}
      
      {/* Main content - three-column layout */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Left panel - controls */}
        <div className={`md:h-full md:fixed md:top-[80px] md:bottom-0 md:overflow-y-auto bg-gray-700 text-white md:shadow-md p-1 z-10 transition-all duration-300 ${
          isTabletView 
            ? isControlPanelOpen 
              ? 'md:w-52 lg:w-60 md:left-0' 
              : 'md:w-12 md:left-0'
            : 'md:w-52 lg:w-60 md:left-0'
        }`}>
          {/* Toggle button for tablet view */}
          {isTabletView && (
            <button 
              className="hidden md:flex items-center justify-center w-full h-8 bg-gray-600 hover:bg-gray-500 mb-2 rounded"
              onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
            >
              {isControlPanelOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          
          {/* Show control panel content only when expanded in tablet view */}
          <div className={isTabletView && !isControlPanelOpen ? 'hidden' : 'block'}>
            <ControlPanel />
          </div>
        </div>
        
        {/* Main content - grid */}
        <div className={`flex-grow flex flex-col transition-all duration-300 ${
          isTabletView 
            ? `md:ml-12 ${isControlPanelOpen ? 'md:ml-52 lg:ml-60' : 'md:ml-12'} ${isStatsMenuOpen ? 'md:mr-52 lg:mr-60' : 'md:mr-12'}`
            : 'md:ml-52 lg:ml-60 md:mr-52 lg:mr-60'
        }`}>
          {/* Statistics at the top removed as requested */}
          
          {/* Grid takes up all available height */}
          <div className="grid-container bg-white rounded shadow mx-1 flex-grow">
            <PixelGrid />
          </div>
          
          {/* Project information - collapsible on tablet view */}
          <div className="hidden md:block p-1 mt-1">
            {isTabletView ? (
              <div className="bg-gray-700 text-white rounded shadow">
                <button 
                  className="w-full flex items-center justify-between p-2 font-bold text-xs"
                  onClick={() => setIsAboutMenuOpen(!isAboutMenuOpen)}
                >
                  <span>About Satoshi Pixel Grid</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 transition-transform duration-300 ${isAboutMenuOpen ? 'transform rotate-180' : ''}`} 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${isAboutMenuOpen ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="p-2 text-xs">
                    <p className="mb-1">
                      Welcome to the Satoshi Pixel Grid project! This web application allows you to purchase pixels
                      using Lightning Network payments. Each pixel costs 1 satoshi (0.00000001 BTC).
                    </p>
                    <p className="mb-1">
                      There are a total of 100,000,000 pixels available, which corresponds exactly to 1 BTC.
                    </p>
                    <p>
                      Contact: <a href="mailto:satoshipixelgrid@gmail.com" className="underline">satoshipixelgrid@gmail.com</a>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-700 text-white rounded shadow p-2 text-xs">
                <h2 className="font-bold mb-1">About Satoshi Pixel Grid</h2>
                <p className="mb-1">
                  Welcome to the Satoshi Pixel Grid project! This web application allows you to purchase pixels
                  using Lightning Network payments. Each pixel costs 1 satoshi (0.00000001 BTC).
                </p>
                <p className="mb-1">
                  There are a total of 100,000,000 pixels available, which corresponds exactly to 1 BTC.
                </p>
                <p>
                  Contact: <a href="mailto:satoshipixelgrid@gmail.com" className="underline">satoshipixelgrid@gmail.com</a>
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right panel - statistics */}
        <div className={`md:h-full md:fixed md:top-[80px] md:bottom-0 md:overflow-y-auto bg-gray-700 text-white md:shadow-md p-1 z-10 transition-all duration-300 ${
          isTabletView 
            ? isStatsMenuOpen 
              ? 'md:w-52 lg:w-60 md:right-0' 
              : 'md:w-12 md:right-0'
            : 'md:w-52 lg:w-60 md:right-0'
        }`}>
          {/* Toggle button for tablet view */}
          {isTabletView && (
            <button 
              className="hidden md:flex items-center justify-center w-full h-8 bg-gray-600 hover:bg-gray-500 mb-2 rounded"
              onClick={() => setIsStatsMenuOpen(!isStatsMenuOpen)}
            >
              {isStatsMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          
          {/* Show statistics content only when expanded in tablet view */}
          <div className={isTabletView && !isStatsMenuOpen ? 'hidden' : 'block'}>
            <Statistics />
          </div>
        </div>
      </div>
      
      {/* Mobile control panel - pinned to the bottom edge */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-700 text-white shadow-md p-1 z-10 mobile-stats-hidden">
        {/* Odstraněn duplicitní ControlPanel, protože je již v hlavním layoutu */}
      </div>
      
      {/* Buttons to open panels - only on mobile devices */}
      <div className="md:hidden fixed bottom-16 right-2 flex flex-col gap-2 z-20">
        <button 
          className="bg-gray-700 text-white p-2 rounded-full shadow-md"
          onClick={() => setIsControlPanelOpen(true)}
          title="Show controls"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        <button 
          className="bg-gray-700 text-white p-2 rounded-full shadow-md"
          onClick={() => setIsStatsMenuOpen(true)}
          title="Show statistics"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        
        <button 
          className="bg-gray-700 text-white p-2 rounded-full shadow-md"
          onClick={() => setIsAboutMenuOpen(true)}
          title="Show about"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      
      {/* Slide-out menu with statistics - only on mobile devices */}
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
      
      {/* Slide-out menu with control panel - only on mobile devices */}
      <div className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isControlPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-gray-800 transform transition-transform duration-300 ${isControlPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button 
            className="absolute top-2 right-2 text-white p-2"
            onClick={() => setIsControlPanelOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-4 overflow-y-auto h-full">
            <ControlPanel />
          </div>
        </div>
      </div>
      
      {/* Slide-out menu with about information - only on mobile devices */}
      <div className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isAboutMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-gray-800 transform transition-transform duration-300 ${isAboutMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button 
            className="absolute top-2 right-2 text-white p-2"
            onClick={() => setIsAboutMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-lg font-bold mb-4 text-white">About Satoshi Pixel Grid</h2>
            <p className="mb-4 text-white">
              Welcome to the Satoshi Pixel Grid project! This web application allows you to purchase pixels
              using Lightning Network payments. Each pixel costs 1 satoshi (0.00000001 BTC).
            </p>
            <p className="mb-4 text-white">
              There are a total of 100,000,000 pixels available, which corresponds exactly to 1 BTC.
            </p>
            <p className="text-white">
              Contact: <a href="mailto:satoshipixelgrid@gmail.com" className="underline">satoshipixelgrid@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment modal window */}
      <PaymentModal />
      
      {/* Successful payment message */}
      <Suspense fallback={null}>
        <PaymentSuccessMessage />
      </Suspense>
    </div>
  );
}
