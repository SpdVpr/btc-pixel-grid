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
      setError('Vyberte alespoň jeden pixel.');
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
        console.error('Neplatné souřadnice pixelů:', invalidPixels);
        setError(`Některé pixely mají neplatné souřadnice. Zkuste nakreslit nový obrázek.`);
        setIsLoading(false);
        return;
      }
      
      // Kontrola, zda všechny barvy jsou platné
      const invalidColors = pixels.filter(p =>
        typeof p.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(p.color)
      );
      
      if (invalidColors.length > 0) {
        console.error('Neplatné barvy pixelů:', invalidColors);
        setError(`Některé pixely mají neplatné barvy. Zkuste nakreslit nový obrázek.`);
        setIsLoading(false);
        return;
      }
      
      console.log('Pixely vybrány:', pixels);
      
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
        setError('Nastala chyba při zpracování požadavku.');
      }
    } catch (error) {
      console.error('Chyba při vytváření faktury:', error);
      
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
          
          setError(`Některé pixely byly mezitím obsazeny (${unavailablePixels.length} pixelů). Byly odstraněny z výběru.`);
        } else if (axiosError.response.status === 400) {
          // Chyba validace
          setError(`Chyba validace: ${axiosError.response.data?.error || 'Neznámá chyba'}`);
        } else {
          setError('Nastala chyba při vytváření faktury. Zkuste to prosím znovu.');
        }
      } else if (axiosError.request) {
        // Požadavek byl odeslán, ale nedošla žádná odpověď
        console.error('Žádná odpověď:', axiosError.request);
        setError('Server neodpovídá. Zkontrolujte připojení k internetu.');
      } else {
        // Něco se pokazilo při nastavování požadavku
        console.error('Chyba:', axiosError.message);
        setError('Nastala chyba při vytváření faktury. Zkuste to prosím znovu.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Přednastavené barvy
  const presetColors = [
    '#000000', // černá
    '#FFFFFF', // bílá
    '#FF0000', // červená
    '#00FF00', // zelená
    '#0000FF', // modrá
    '#FFFF00', // žlutá
    '#FF00FF', // purpurová
    '#00FFFF', // azurová
    '#FFA500', // oranžová
    '#800080', // fialová
  ];
  
  return (
    <div className="p-2 rounded h-full">
      {/* Mobilní verze - kompaktní */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-white">Ovládací panel</h2>
          
          {/* Tlačítko pro otevření/zavření výběru barvy */}
          <button
            className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full"
            onClick={() => {
              setIsColorPickerOpen(!isColorPickerOpen);
              // Pokud uživatel klikne na výběr barvy, aktivujeme režim kreslení
              if (!isDrawingMode) {
                setIsDrawingMode(true);
                // Najdeme všechny instance PixelGrid a nastavíme jim režim kreslení
                const event = new CustomEvent('toggleDrawingMode', { detail: { isDrawingMode: true } });
                window.dispatchEvent(event);
              }
            }}
          >
            <div className="w-6 h-6 rounded-full border border-white" style={{ backgroundColor: selectedColor }}></div>
          </button>
        </div>
        
        {/* Výběr barvy - zobrazí se pouze po kliknutí na tlačítko */}
        {isColorPickerOpen && (
          <div className="mb-3 p-3 bg-gray-800 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border ${
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
                  aria-label={`Vybrat barvu ${color}`}
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
                className="w-8 h-8"
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
          </div>
        )}
        
        {/* Informace o výběru a tlačítka - vždy viditelné */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-white">
            <p className="text-sm">Pixelů: <strong>{selectedCount}</strong></p>
            <p className="text-sm">Cena: <strong>{selectedCount} sat</strong></p>
          </div>
          
          <div className="flex gap-2">
            {/* Tlačítko pro aktivaci gumy - výraznější indikace aktivního stavu */}
            <button
              className={`p-2 rounded-full relative ${
                isEraserActive 
                  ? 'bg-red-500 text-white font-bold border-2 border-white shadow-lg' 
                  : 'bg-gray-600 text-white'
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
                
                // Zobrazit zprávu o stavu gumy
                if (!isEraserActive) {
                  alert('Guma je nyní AKTIVNÍ - klikáním mažete pixely');
                } else {
                  alert('Guma je nyní VYPNUTÁ - klikáním kreslíte pixely');
                }
              }}
              title={isEraserActive ? "Guma je aktivní" : "Aktivovat gumu"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L21 10C21.5 10.5 21.5 11.5 21 12L11 22" />
              </svg>
              {isEraserActive && (
                <>
                  <span className="absolute -top-1 -right-1 bg-white rounded-full w-3 h-3"></span>
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                    GUMA AKTIVNÍ
                  </span>
                </>
              )}
            </button>
            
            {/* Tlačítko pro vymazání kresby */}
            <button
              className="bg-gray-600 text-white p-2 rounded-full disabled:opacity-50"
              onClick={() => {
                if (window.confirm('Opravdu chcete vymazat celou kresbu?')) {
                  clearSelection();
                }
              }}
              disabled={isLoading || selectedCount === 0}
              title="Vymazat celou kresbu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            {/* Tlačítko pro platbu */}
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full disabled:opacity-50"
              onClick={handlePurchasePixels}
              disabled={isLoading || selectedCount === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Chybová hláška */}
        {error && (
          <div className="mt-1 p-2 bg-red-800 text-white rounded border border-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Desktop verze - plná */}
      <div className="hidden md:block">
        <h2 className="text-lg font-bold mb-4 text-white">Ovládací panel</h2>
        
        {/* Výběr barvy */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-white">Barva pixelu:</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {presetColors.map((color) => (
              <button
                key={color}
                className={`w-10 h-10 rounded-full border ${
                  selectedColor === color ? 'border-2 border-white' : 'border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Vybrat barvu ${color}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
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
          
          {/* Tlačítko pro aktivaci gumy */}
          <button
            className={`mt-3 py-2 px-4 rounded font-medium ${
              isEraserActive ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
            }`}
            onClick={() => setIsEraserActive(!isEraserActive)}
          >
            Gumovat
          </button>
        </div>
        
        {/* Informace o výběru */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg text-white">
          <p className="text-lg">Vybraných pixelů: <strong>{selectedCount}</strong></p>
          <p className="text-lg">Cena: <strong>{selectedCount} satoshi</strong></p>
          {bitcoinPrice > 0 && (
            <p className="text-lg">Cena v USD: <strong>${selectedPriceUsd.toFixed(8)}</strong></p>
          )}
        </div>
        
        {/* Tlačítka */}
        <div className="flex flex-col gap-3">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg text-lg font-medium disabled:opacity-50"
            onClick={handlePurchasePixels}
            disabled={isLoading || selectedCount === 0}
          >
            {isLoading ? 'Zpracovávám...' : 'Zaplatit'}
          </button>
          
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg text-lg font-medium"
            onClick={() => {
              if (window.confirm('Opravdu chcete vymazat celou kresbu?')) {
                clearSelection();
              }
            }}
            disabled={isLoading || selectedCount === 0}
          >
            Vymazat kresbu
          </button>
        </div>
        
        {/* Chybová hláška */}
        {error && (
          <div className="mt-4 p-2 bg-red-800 text-white rounded border border-red-600">
            {error}
          </div>
        )}
        
        {/* Nápověda */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
          <h3 className="font-bold mb-2">Jak na to:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kliknutím na grid nakreslete obrázek, který chcete zakoupit</li>
            <li>Můžete libovolně kreslit a mazat, dokud nebudete spokojeni</li>
            <li>Každý pixel stojí 1 satoshi (0.00000001 BTC)</li>
            <li>Pro posun plátna použijte pravé tlačítko myši</li>
            <li>Pro přiblížení/oddálení použijte kolečko myši</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
