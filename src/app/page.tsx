import PixelGrid from '../components/PixelGrid';
import ControlPanel from '../components/ControlPanel';
import Statistics from '../components/Statistics';
import PaymentModal from '../components/PaymentModal';
import PaymentSuccessMessage from '../components/PaymentSuccessMessage';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hlavička */}
      <header className="bg-[#f2a900] text-white p-4 text-center shadow">
        <h1 className="text-2xl font-bold">Satoshi Pixel Grid</h1>
        <p>1 BTC = 100 000 000 pixelů, 1 satoshi = 1 pixel</p>
      </header>
      
      {/* Statistiky nahoře - viditelné pouze na mobilních zařízeních */}
      <div className="w-full p-2 md:hidden">
        <div className="stats bg-gray-700 text-white p-4 rounded shadow mb-4 flex justify-between">
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
      
      {/* Patička */}
      <footer className="text-center p-4 border-t mt-auto">
        <p>&copy; {new Date().getFullYear()} Satoshi Pixel Grid | Všechny pixely jsou uloženy na Bitcoinovém blockchainu</p>
      </footer>
      
      {/* Modální okno pro platbu */}
      <PaymentModal />
      
      {/* Zpráva o úspěšné platbě */}
      <PaymentSuccessMessage />
    </div>
  );
}
