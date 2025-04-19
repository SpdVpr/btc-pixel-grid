// Optimalizovaná struktura pro ukládání pixelů - rozdělení do regionů
type PixelData = { color: string; owner?: string; url?: string; message?: string };
type PixelRegion = Map<string, PixelData>;

// Mapa regionů - klíč je ve formátu "regionX,regionY"
const mockPixelRegions = new Map<string, PixelRegion>();

// Velikost regionu v pixelech
const REGION_SIZE = 1000;

// Funkce pro přidání pixelu do správného regionu
function addPixelToRegion(x: number, y: number, data: PixelData) {
  const regionX = Math.floor(x / REGION_SIZE);
  const regionY = Math.floor(y / REGION_SIZE);
  const regionKey = `${regionX},${regionY}`;
  
  // Vytvoření regionu, pokud neexistuje
  if (!mockPixelRegions.has(regionKey)) {
    mockPixelRegions.set(regionKey, new Map());
  }
  
  // Přidání pixelu do regionu
  const region = mockPixelRegions.get(regionKey)!;
  const pixelKey = `${x},${y}`;
  region.set(pixelKey, data);
}

// Generování náhodných pixelů pro demo - více pixelů pro větší plátno
// Generujeme pixely v různých regionech pro lepší testování
for (let i = 0; i < 1000; i++) { // Zvýšeno na 1000 pixelů
  const x = Math.floor(Math.random() * 10000); // Rozšířeno na 10000x10000
  const y = Math.floor(Math.random() * 10000);
  
  // Náhodná barva
  const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  
  // Přidání pixelu do správného regionu
  addPixelToRegion(x, y, {
    color,
    owner: 'demo-user',
  });
}

// Zpětná kompatibilita - převod na ploché pole pro starší kód
const mockPixels: Record<string, PixelData> = {};

// Naplnění plochého pole z regionů
mockPixelRegions.forEach((region, regionKey) => {
  region.forEach((data, pixelKey) => {
    mockPixels[pixelKey] = data;
  });
});

// Optimalizovaná mock funkce pro získání pixelů v rozsahu
export async function mockGetPixelsInRange(
  startX: number,
  endX: number,
  startY: number,
  endY: number
) {
  const result: Record<string, PixelData> = {};
  
  // Výpočet regionů, které se překrývají s požadovaným rozsahem
  const startRegionX = Math.floor(startX / REGION_SIZE);
  const startRegionY = Math.floor(startY / REGION_SIZE);
  const endRegionX = Math.floor(endX / REGION_SIZE);
  const endRegionY = Math.floor(endY / REGION_SIZE);
  
  // Procházení relevantních regionů
  for (let regionX = startRegionX; regionX <= endRegionX; regionX++) {
    for (let regionY = startRegionY; regionY <= endRegionY; regionY++) {
      const regionKey = `${regionX},${regionY}`;
      
      // Kontrola, zda region existuje
      if (mockPixelRegions.has(regionKey)) {
        const region = mockPixelRegions.get(regionKey)!;
        
        // Procházení pixelů v regionu
        region.forEach((data, key) => {
          const [x, y] = key.split(',').map(Number);
          
          // Kontrola, zda pixel je v požadovaném rozsahu
          if (x >= startX && x <= endX && y >= startY && y <= endY) {
            result[key] = data;
          }
        });
      }
    }
  }
  
  // Simulace zpoždění pro testování načítání
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Přidání rezervovaných pixelů, pokud jsou v daném rozsahu
  // Toto by v reálné aplikaci bylo řešeno v databázi
  try {
    // Dynamický import, abychom předešli cyklickým závislostem
    const { pixelReservations } = await import('../../app/api/pixels/select/route');
    
    Object.entries(pixelReservations).forEach(([key, reservation]) => {
      const [x, y] = key.split(',').map(Number);
      
      if (x >= startX && x <= endX && y >= startY && y <= endY) {
        // Pokud pixel ještě není v result, přidáme ho jako rezervovaný
        if (!result[key]) {
          result[key] = {
            color: '#CCCCCC', // Šedá barva pro rezervované pixely
            owner: 'reserved'
          };
        }
      }
    });
  } catch (error) {
    console.error('Chyba při získávání rezervací:', error);
    // Pokračujeme bez rezervací
  }
  
  // Přidání rezervovaných pixelů, pokud jsou v daném rozsahu
  // Toto by v reálné aplikaci bylo řešeno v databázi
  try {
    // Dynamický import, abychom předešli cyklickým závislostem
    const { pixelReservations } = await import('../../app/api/pixels/select/route');
    
    Object.entries(pixelReservations).forEach(([key, reservation]) => {
      const [x, y] = key.split(',').map(Number);
      
      if (x >= startX && x <= endX && y >= startY && y <= endY) {
        // Pokud pixel ještě není v result, přidáme ho jako rezervovaný
        if (!result[key]) {
          result[key] = {
            color: '#CCCCCC', // Šedá barva pro rezervované pixely
            owner: 'reserved'
          };
        }
      }
    });
  } catch (error) {
    console.error('Chyba při získávání rezervací:', error);
    // Pokračujeme bez rezervací
  }
  
  return result;
}

// Mock data pro statistiky - upraveno pro větší grid
export const mockStatistics = {
  totalPixelsSold: 1000,
  totalSatoshisCollected: 1000,
  percentageSold: '0.00100', // 1000 / 10000^2 = 0.001%
  percentageCollected: '0.00100',
  lastUpdated: new Date().toISOString(),
};

// Mock funkce pro vytvoření faktury
export async function mockCreateCharge(amount: number, description: string) {
  return {
    invoiceId: `mock-invoice-${Date.now()}`,
    amount,
    lightning_invoice: 'lnbc1u1p3xyzyzpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8gxqyjw5qcqp9sp5yzyz',
    expires_at: new Date(Date.now() + 600000).toISOString(), // Vyprší za 10 minut
    pixelCount: amount,
  };
}