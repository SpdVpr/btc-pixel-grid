import { create } from 'zustand';

// Typy
export type PixelData = {
  x: number;
  y: number;
  color: string;
};

export type PixelInfo = {
  color: string;
  owner?: string;
  link?: string;
  message?: string;
};

export type SelectedPixels = Record<string, PixelInfo>;

export interface PixelStore {
  // Stav
  selectedPixels: SelectedPixels;
  selectedColor: string;
  isSelecting: boolean;
  isEraserActive: boolean;
  paymentModalOpen: boolean;
  invoiceData: {
    invoiceId?: string;
    amount: number;
    lightning_invoice?: string;
    expires_at?: string;
    expiresAt?: string;
    pixelCount: number;
    chargeId?: string;
    hostedCheckoutUrl?: string;
  } | null;
  
  // Akce
  selectPixel: (x: number, y: number, color: string) => void;
  deselectPixel: (x: number, y: number) => void;
  clearSelection: () => void;
  setSelectedColor: (color: string) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setIsEraserActive: (isActive: boolean) => void;
  setPaymentModalOpen: (open: boolean) => void;
  setInvoiceData: (data: any) => void;
}

export const usePixelStore = create<PixelStore>((set) => ({
  // Výchozí stav
  selectedPixels: {},
  selectedColor: '#000000',
  isSelecting: false,
  isEraserActive: false,
  paymentModalOpen: false,
  invoiceData: null,
  
  // Akce
  selectPixel: (x, y, color) => set((state) => {
    const key = `${x},${y}`;
    return {
      selectedPixels: {
        ...state.selectedPixels,
        [key]: { color }
      }
    };
  }),
  
  deselectPixel: (x, y) => set((state) => {
    const key = `${x},${y}`;
    const newSelectedPixels = { ...state.selectedPixels };
    delete newSelectedPixels[key];
    return { selectedPixels: newSelectedPixels };
  }),
  
  clearSelection: () => set({ selectedPixels: {} }),
  
  setSelectedColor: (color) => set((state) => ({ 
    selectedColor: color,
    isEraserActive: false // Automatically turn off eraser when a color is selected
  })),
  
  setIsSelecting: (isSelecting) => set({ isSelecting }),
  
  setIsEraserActive: (isActive) => set({ isEraserActive: isActive }),
  
  setPaymentModalOpen: (open) => set({ paymentModalOpen: open }),
  
  setInvoiceData: (data) => set({ invoiceData: data }),
}));

// Store pro statistiky
interface StatisticsStore {
  // Stav
  totalPixelsSold: number;
  totalSatoshisCollected: number;
  percentageSold: string;
  percentageCollected: string;
  lastUpdated: string | null;
  isLoading: boolean;
  
  // Akce
  setStatistics: (data: any) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useStatisticsStore = create<StatisticsStore>((set) => ({
  // Výchozí stav
  totalPixelsSold: 0,
  totalSatoshisCollected: 0,
  percentageSold: '0',
  percentageCollected: '0',
  lastUpdated: null,
  isLoading: false,
  
  // Akce
  setStatistics: (data) => set({
    totalPixelsSold: data.totalPixelsSold,
    totalSatoshisCollected: data.totalSatoshisCollected,
    percentageSold: data.percentageSold,
    percentageCollected: data.percentageCollected,
    lastUpdated: data.lastUpdated,
  }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
}));
