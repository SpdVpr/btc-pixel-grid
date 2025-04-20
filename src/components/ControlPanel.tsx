'use client';

import { useState } from 'react';
import { usePixelStore } from '../lib/store';
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Počet vybraných pixelů
  const selectedCount = Object.keys(selectedPixels).length;
  
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
    <div className="p-4 rounded h-full">
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
          className={`mt-3 py-2 px-4 rounded ${
            isEraserActive ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
          }`}
          onClick={() => setIsEraserActive(!isEraserActive)}
        >
          {isEraserActive ? 'Vypnout gumu' : 'Zapnout gumu'}
        </button>
      </div>
      
      {/* Informace o výběru */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg text-white">
        <p className="text-lg">Vybraných pixelů: <strong>{selectedCount}</strong></p>
        <p className="text-lg">Cena: <strong>{selectedCount} satoshi</strong></p>
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
          onClick={clearSelection}
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
  );
}
