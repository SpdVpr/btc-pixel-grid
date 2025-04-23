'use client';

import { useState } from 'react';
import { usePixelStore, useStatisticsStore } from '../lib/store';
import axios, { AxiosError } from 'axios';

export default function ControlPanel() {
  const {
    selectedPixels,
    selectedColor,
    setSelectedColor,
    clearSelection,
    setPaymentModalOpen,
    setInvoiceData,
    deselectPixel,
    isEraserActive,
    setIsEraserActive
  } = usePixelStore();
  
  // Reference na PixelGrid komponentu pro přepínání režimu kreslení
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  const { bitcoinPrice } = useStatisticsStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Počet vybraných pixelů
  const selectedCount = Object.keys(selectedPixels).length;
  
  // Výpočet ceny v USD
  const satoshiToUsd = (satoshis: number): number => {
    if (!bitcoinPrice || bitcoinPrice <= 0) return 0;
    return (satoshis * bitcoinPrice) / 100000000;
  };
  
  const selectedPriceUsd = satoshiToUsd(selectedCount);
  
  // Funkce pro zakoupení pixelů
  const handlePurchasePixels = async () => {
    if (selectedCount === 0) {
      setError('Select at least one pixel.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Příprava dat pro API
      const pixels = Object.entries(selectedPixels).map(([key, data]) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y, color: data.color };
      });
      
      // Kontrola, zda všechny souřadnice jsou v platném rozsahu
      const invalidPixels = pixels.filter(p =>
        p.x < 0 || p.x > 9999 || p.y < 0 || p.y > 9999 ||
        typeof p.x !== 'number' || typeof p.y !== 'number' ||
        isNaN(p.x) || isNaN(p.y)
      );
      
      if (invalidPixels.length > 0) {
        console.error('Invalid pixel coordinates:', invalidPixels);
        setError(`Some pixels have invalid coordinates. Try drawing a new image.`);
        setIsLoading(false);
        return;
      }
      
      // Kontrola, zda všechny barvy jsou platné
      const invalidColors = pixels.filter(p =>
        typeof p.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(p.color)
      );
      
      if (invalidColors.length > 0) {
        console.error('Invalid pixel colors:', invalidColors);
        setError(`Some pixels have invalid colors. Try drawing a new image.`);
        setIsLoading(false);
        return;
      }
      
      console.log('Pixels selected:', pixels);
      
      // Odeslání požadavku na API
      const response = await axios.post('/api/pixels/select', {
        pixels
      });
      
      // Zpracování odpovědi
      if (response.data.success) {
        // Vytvoření dat pro modální okno z odpovědi API
        setInvoiceData({
          amount: selectedCount,
          pixelCount: selectedCount,
          chargeId: response.data.chargeId,
          hostedCheckoutUrl: response.data.hostedCheckoutUrl,
          lightning_invoice: response.data.lightningInvoice?.payreq,
          expiresAt: response.data.expiresAt
        });
        
        // Otevření modálního okna
        setPaymentModalOpen(true);
      } else {
        setError('An error occurred while processing the request.');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      
      // Podrobnější výpis chyby pro ladění
      const axiosError = error as AxiosError<{error?: string, unavailablePixels?: string[]}>;
      
      if (axiosError.response) {
        console.error('Status:', axiosError.response.status);
        console.error('Data:', axiosError.response.data);
        console.error('Headers:', axiosError.response.headers);
        
        // Kontrola, zda jde o chybu s nedostupnými pixely
        if (axiosError.response.status === 409) {
          const unavailablePixels = axiosError.response.data?.unavailablePixels || [];
          
          // Odstranění nedostupných pixelů z výběru
          unavailablePixels.forEach((key: string) => {
            const [x, y] = key.split(',').map(Number);
            deselectPixel(x, y);
          });
          
          setError(`Some pixels have been occupied in the meantime (${unavailablePixels.length} pixels). They have been removed from the selection.`);
        } else if (axiosError.response.status === 400) {
          // Chyba validace
          setError(`Validation error: ${axiosError.response.data?.error || 'Unknown error'}`);
        } else {
          setError('An error occurred while creating the invoice. Please try again.');
        }
      } else if (axiosError.request) {
        // Požadavek byl odeslán, ale nedošla žádná odpověď
        console.error('No response:', axiosError.request);
        setError('The server is not responding. Check your internet connection.');
      } else {
        // Něco se pokazilo při nastavování požadavku
        console.error('Error:', axiosError.message);
        setError('An error occurred while creating the invoice. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Preset colors
  const presetColors = [
    '#000000', // black
    '#FFFFFF', // white
    '#FF0000', // red
    '#00FF00', // green
    '#0000FF', // blue
    '#FFFF00', // yellow
    '#FF00FF', // magenta
    '#00FFFF', // cyan
    '#FFA500', // orange
    '#800080', // purple
  ];
  
  return (
    <div className="p-2 rounded h-full">
      <h2 className="text-lg font-bold mb-4 text-white">Control Panel</h2>
      
      {/* Color selection */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-white">Pixel color:</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {presetColors.map((color) => (
            <button
              key={color}
              className={`w-10 h-10 rounded-full border ${
                selectedColor === color ? 'border-2 border-white' : 'border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setSelectedColor(color);
                // Aktivujeme režim kreslení při výběru barvy
                if (!isDrawingMode) {
                  setIsDrawingMode(true);
                  // Najdeme všechny instance PixelGrid a nastavíme jim režim kreslení
                  const event = new CustomEvent('toggleDrawingMode', { detail: { isDrawingMode: true } });
                  window.dispatchEvent(event);
                }
              }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value);
              // Aktivujeme režim kreslení při výběru barvy
              if (!isDrawingMode) {
                setIsDrawingMode(true);
                // Najdeme všechny instance PixelGrid a nastavíme jim režim kreslení
                const event = new CustomEvent('toggleDrawingMode', { detail: { isDrawingMode: true } });
                window.dispatchEvent(event);
              }
            }}
            className="w-10 h-10"
          />
          <input
            type="text"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="border border-gray-400 rounded px-2 py-1 text-sm flex-grow bg-gray-800 text-white"
            pattern="^#[0-9A-Fa-f]{6}$"
            placeholder="#RRGGBB"
          />
        </div>
        
        {/* Button to activate eraser */}
        <button
          className={`mt-3 py-2 px-4 rounded font-medium ${
            isEraserActive ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
          }`}
          onClick={() => {
            setIsEraserActive(!isEraserActive);
            // Aktivujeme režim kreslení při použití gumy
            if (!isDrawingMode) {
              setIsDrawingMode(true);
              // Najdeme všechny instance PixelGrid a nastavíme jim režim kreslení
              const event = new CustomEvent('toggleDrawingMode', { detail: { isDrawingMode: true } });
              window.dispatchEvent(event);
            }
          }}
        >
          Erase
        </button>
      </div>
      
      {/* Selection information */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg text-white">
        <p className="text-lg">Selected pixels: <strong>{selectedCount}</strong></p>
        <p className="text-lg">Price: <strong>{selectedCount} satoshi</strong></p>
        {bitcoinPrice > 0 && (
          <p className="text-lg">Price in USD: <strong>${selectedPriceUsd.toFixed(8)}</strong></p>
        )}
      </div>
      
      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg text-lg font-medium disabled:opacity-50"
          onClick={handlePurchasePixels}
          disabled={isLoading || selectedCount === 0}
        >
          {isLoading ? 'Processing...' : 'Pay'}
        </button>
        
        <button
          className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg text-lg font-medium"
          onClick={() => {
            if (window.confirm('Do you really want to clear the entire drawing?')) {
              clearSelection();
            }
          }}
          disabled={isLoading || selectedCount === 0}
        >
          Clear drawing
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 p-2 bg-red-800 text-white rounded border border-red-600">
          {error}
        </div>
      )}
      
      {/* Help */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
        <h3 className="font-bold mb-2">How to:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Click on the grid to draw the image you want to purchase</li>
          <li>You can freely draw and erase until you are satisfied</li>
          <li>Each pixel costs 1 satoshi (0.00000001 BTC)</li>
          <li>Use the right mouse button to move the canvas</li>
          <li>Use the mouse wheel to zoom in/out</li>
        </ul>
      </div>
    </div>
  );
}
