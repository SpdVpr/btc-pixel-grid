'use client';

import { useEffect, useRef, useState } from 'react';
import { usePixelStore, PixelInfo, SelectedPixels } from '../lib/store';
import axios from 'axios';
// Import Canvas API version as fallback
import dynamic from 'next/dynamic';

// Use canvas element as fallback
export default function PixelGrid() {
  // Reference na canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Základní nastavení
  const pixelSize = 5;
  const gridSize = 10000; // Maximální velikost je 10000x10000, ale souřadnice jsou 0-9999
  
  // Interní stavy aplikace
  const [pixelData, setPixelData] = useState<Record<string, { color: string; owner?: string; link?: string; message?: string }>>({});
  const [pixelCache, setPixelCache] = useState<Map<string, Map<string, { color: string; owner?: string; link?: string; message?: string }>>>(new Map());
  const [isGridVisible, setIsGridVisible] = useState(true); // Stav viditelnosti mřížky
  const [isLoading, setIsLoading] = useState(false); // Indikátor načítání
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Indikátor prvního načtení
  
  // Proměnné pro interakci s myší
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Nastavení pohledu
  const [zoomLevel, setZoomLevel] = useState(0.05); // Minimální zoom pro maximální oddálení
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Získání vybraných pixelů a dalších stavů ze store
  const {
    selectedPixels,
    selectPixel,
    deselectPixel,
    clearSelection,
    selectedColor,
    setSelectedColor,
    isEraserActive
  } = usePixelStore();
  
  // Nastavení velikosti canvasu a inicializace plátna
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Vyčištění plátna při změně velikosti
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      renderGrid();
    };
    
    // Nastavení výchozího pozadí
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Přidání podpory pro dotykové události
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartZoom, setTouchStartZoom] = useState<number>(0);
  const [isTouching, setIsTouching] = useState(false);
  const [touchStartPoint, setTouchStartPoint] = useState({ x: 0, y: 0 });
  const [touchStartPan, setTouchStartPan] = useState({ x: 0, y: 0 });
  const [isTouchDrawing, setIsTouchDrawing] = useState(false);
  const [lastTouchPos, setLastTouchPos] = useState<{x: number, y: number} | null>(null);
  
  // Funkce pro změnu úrovně přiblížení
  const changeZoomLevel = (delta: number) => {
    const MIN_ZOOM = 0.05;
    const MAX_ZOOM = 3.0;
    
    // Výpočet nové úrovně přiblížení
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel * (1 + delta)));
    
    // Kontrola platnosti hodnoty
    if (isNaN(newZoom) || !isFinite(newZoom) || newZoom <= 0) {
      console.error('Neplatná hodnota zoomu:', newZoom);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Centrování zoomu na střed plátna
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Převod středu na světové souřadnice
    const worldX = (centerX - panOffset.x) / (pixelSize * zoomLevel);
    const worldY = (centerY - panOffset.y) / (pixelSize * zoomLevel);
    
    // Výpočet nového posunu tak, aby střed zůstal na stejném místě
    const newPanX = centerX - worldX * pixelSize * newZoom;
    const newPanY = centerY - worldY * pixelSize * newZoom;
    
    // Kontrola platnosti hodnot
    if (isNaN(newPanX) || isNaN(newPanY) || !isFinite(newPanX) || !isFinite(newPanY)) {
      console.error('Neplatné hodnoty posunu:', { newPanX, newPanY });
      return;
    }
    
    // Výpočet hranic pro omezení posunu
    const minVisibleWidth = Math.max(300, canvas.width * 0.3);
    const minVisibleHeight = Math.max(300, canvas.height * 0.3);
    
    // Výpočet velikosti gridu v pixelech při novém zoomu
    const gridWidthPx = 10000 * pixelSize * newZoom;
    const gridHeightPx = 10000 * pixelSize * newZoom;
    
    // Omezení posunu tak, aby grid nemohl být posunut mimo viditelnou oblast
    const maxPanLeft = canvas.width - minVisibleWidth;
    const maxPanTop = canvas.height - minVisibleHeight;
    const minPanRight = -(gridWidthPx - minVisibleWidth);
    const minPanBottom = -(gridHeightPx - minVisibleHeight);
    
    // Aplikace omezení na nové hodnoty posunu
    const constrainedX = Math.min(maxPanLeft, Math.max(minPanRight, newPanX));
    const constrainedY = Math.min(maxPanTop, Math.max(minPanBottom, newPanY));
    
    // Aplikace nových hodnot s omezeními
    setZoomLevel(newZoom);
    setPanOffset({ x: constrainedX, y: constrainedY });
  };
  
  // Vykreslení gridu a všech pixelů - zjednodušeno a optimalizováno podle canvas-zoom-test.html
  const renderGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas není k dispozici');
      return;
    }
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Vypnutí alpha kanálu pro lepší výkon
    if (!ctx) {
      console.log('Context není k dispozici');
      return;
    }
    
    // Kontrola platnosti hodnot zoomu
    if (zoomLevel <= 0 || isNaN(zoomLevel) || !isFinite(zoomLevel)) {
      console.error('Neplatná hodnota zoomu:', zoomLevel);
      setZoomLevel(0.1); // Bezpečná hodnota
      return;
    }
    
    // Kontrola a oprava pozice panOffset, aby grid zůstal viditelný
    const minVisibleWidth = Math.max(300, canvas.width * 0.3);
    const minVisibleHeight = Math.max(300, canvas.height * 0.3);
    
    const gridWidthPx = 10000 * pixelSize * zoomLevel;
    const gridHeightPx = 10000 * pixelSize * zoomLevel;
    
    const maxPanLeft = canvas.width - minVisibleWidth;
    const maxPanTop = canvas.height - minVisibleHeight;
    const minPanRight = -(gridWidthPx - minVisibleWidth);
    const minPanBottom = -(gridHeightPx - minVisibleHeight);
    
    // Pokud je aktuální pozice mimo povolený rozsah, opravíme ji
    let newPanX = panOffset.x;
    let newPanY = panOffset.y;
    
    if (newPanX > maxPanLeft) newPanX = maxPanLeft;
    if (newPanX < minPanRight) newPanX = minPanRight;
    if (newPanY > maxPanTop) newPanY = maxPanTop;
    if (newPanY < minPanBottom) newPanY = minPanBottom;
    
    // Pokud došlo ke změně, aktualizujeme panOffset
    if (newPanX !== panOffset.x || newPanY !== panOffset.y) {
      setPanOffset({ x: newPanX, y: newPanY });
      return; // Ukončíme renderování, bude voláno znovu po aktualizaci panOffset
    }
    
    // Vyčištění celého canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Aplikace transformace pro zoom a pan
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    
    // Určení viditelné oblasti
    const visibleStartX = Math.floor(-panOffset.x / (pixelSize * zoomLevel));
    const visibleStartY = Math.floor(-panOffset.y / (pixelSize * zoomLevel));
    const visibleEndX = Math.ceil((canvas.width - panOffset.x) / (pixelSize * zoomLevel));
    const visibleEndY = Math.ceil((canvas.height - panOffset.y) / (pixelSize * zoomLevel));
    
    // Omezení viditelné oblasti na hranice plátna (0-9999)
    const startX = Math.max(0, visibleStartX);
    const startY = Math.max(0, visibleStartY);
    const endX = Math.min(9999, visibleEndX);
    const endY = Math.min(9999, visibleEndY);
    
    // Vykreslení pozadí plátna - omezení na 0-9999
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 10000 * pixelSize, 10000 * pixelSize);
    
    // Vykreslení ohraničení gridu - zajistí viditelné ukončení mřížky
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2 / zoomLevel;
    ctx.strokeRect(0, 0, 10000 * pixelSize, 10000 * pixelSize);
    
    // Vykreslení mřížky - adaptivní podle úrovně zoomu
    ctx.strokeStyle = '#eeeeee'; // Světlejší barva mřížky
    ctx.lineWidth = 1 / zoomLevel;
    
    // Omezení počtu čar pro lepší výkon
    const maxLines = 200;
    const visibleWidth = endX - startX;
    const visibleHeight = endY - startY;
    
    // Výpočet kroku pro omezení počtu čar
    const lineStepX = Math.max(1, Math.ceil(visibleWidth / maxLines));
    const lineStepY = Math.max(1, Math.ceil(visibleHeight / maxLines));
    
    // Vykreslení mřížky - pouze pokud je viditelná
    if (isGridVisible) {
      // Při nízkém zoomu zvětšíme krok mřížky, aby nebyla příliš hustá
      let adaptiveStepX = lineStepX;
      let adaptiveStepY = lineStepY;
      
      // Dynamická úprava kroku mřížky podle úrovně zoomu
      if (zoomLevel < 0.2) {
        // Výraznější přizpůsobení pro velmi nízký zoom
        const scaleFactor = Math.max(1, Math.ceil(0.2 / zoomLevel) * 5);
        adaptiveStepX = lineStepX * scaleFactor;
        adaptiveStepY = lineStepY * scaleFactor;
        
        // Světlejší, ale stále viditelné čáry při nízkém zoomu
        ctx.strokeStyle = '#d0d0d0'; // Světlejší barva pro menší rušení grafiky
        ctx.lineWidth = 1.5 / zoomLevel; // Silnější čáry při nízkém zoomu, ale ne příliš výrazné
      }
      
      // Vertikální čáry - zajistíme, že poslední čára je vždy na konci gridu
      for (let x = Math.floor(startX / adaptiveStepX) * adaptiveStepX; x <= endX; x += adaptiveStepX) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, startY * pixelSize);
        ctx.lineTo(x * pixelSize, Math.min(endY, 10000) * pixelSize);
        ctx.stroke();
      }
      
      // Přidáme explicitně pravou hranici, pokud není v rozsahu
      if (endX < 10000 && startX < 10000) {
        ctx.beginPath();
        ctx.moveTo(10000 * pixelSize, startY * pixelSize);
        ctx.lineTo(10000 * pixelSize, Math.min(endY, 10000) * pixelSize);
        ctx.stroke();
      }
      
      // Horizontální čáry - zajistíme, že poslední čára je vždy na konci gridu
      for (let y = Math.floor(startY / adaptiveStepY) * adaptiveStepY; y <= endY; y += adaptiveStepY) {
        ctx.beginPath();
        ctx.moveTo(startX * pixelSize, y * pixelSize);
        ctx.lineTo(Math.min(endX, 10000) * pixelSize, y * pixelSize);
        ctx.stroke();
      }
      
      // Přidáme explicitně dolní hranici, pokud není v rozsahu
      if (endY < 10000 && startY < 10000) {
        ctx.beginPath();
        ctx.moveTo(startX * pixelSize, 10000 * pixelSize);
        ctx.lineTo(Math.min(endX, 10000) * pixelSize, 10000 * pixelSize);
        ctx.stroke();
      }
    }
    
    // Vykreslení existujících pixelů - pouze v platném rozsahu 0-9999
    for (const [key, data] of Object.entries(pixelData)) {
      const [x, y] = key.split(',').map(Number);
      
      // Kontrola, zda jsou souřadnice v platném rozsahu a viditelné
      if (x >= 0 && x <= 9999 && y >= 0 && y <= 9999 &&
          x >= startX && x < endX && y >= startY && y < endY) {
        ctx.fillStyle = data.color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        
        // Přidání vizuálního indikátoru pro vlastněné pixely
        if (data.owner && data.owner !== 'demo-preview' && zoomLevel >= 0.5) {
          // Přidáme malý symbol zámku nebo značku v rohu pixelu
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          const lockSize = pixelSize * 0.3;
          ctx.fillRect(
            (x * pixelSize) + (pixelSize - lockSize), 
            (y * pixelSize), 
            lockSize, 
            lockSize
          );
        }
      }
    }
    
    // Vykreslení vybraných pixelů - pouze v platném rozsahu 0-9999
    ctx.globalAlpha = 0.5;
    Object.entries(selectedPixels).forEach(([key, data]: [string, PixelInfo]) => {
      const [x, y] = key.split(',').map(Number);
      
      // Kontrola, zda jsou souřadnice v platném rozsahu a viditelné
      if (x >= 0 && x <= 9999 && y >= 0 && y <= 9999 &&
          x >= startX && x < endX && y >= startY && y < endY) {
        ctx.fillStyle = data.color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        
        // Ohraničení vybraných pixelů pouze při dostatečném přiblížení
        if (zoomLevel >= 0.5) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    });
    ctx.globalAlpha = 1.0;
    
    ctx.restore();
  };
  
  // Efekt pro vykreslení gridu při změně závislostí
  useEffect(() => {
    // Použití requestAnimationFrame pro plynulejší vykreslování
    const animationId = requestAnimationFrame(() => {
      renderGrid();
    });
    
    // Změna kurzoru podle aktivního nástroje
    if (canvasRef.current) {
      if (isEraserActive) {
        canvasRef.current.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L21 10C21.5 10.5 21.5 11.5 21 12L11 22\'%3E%3C/path%3E%3C/svg%3E") 0 24, auto';
      } else {
        canvasRef.current.style.cursor = 'crosshair';
      }
    }
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [zoomLevel, panOffset, pixelData, selectedPixels, selectedColor, pixelCache, isGridVisible, isEraserActive]);
  
  // Efekt pro nastavení počátečního stavu načítání a centrování plátna - pouze při prvním načtení
  useEffect(() => {
    // Nastavení počátečního stavu načítání na true
    setIsLoading(true);
    
    // Centrování plátna pouze při prvním načtení
    const canvas = canvasRef.current;
    if (canvas) {
      // Výpočet centrální pozice
      const gridWidthPx = 10000 * pixelSize * zoomLevel;
      const gridHeightPx = 10000 * pixelSize * zoomLevel;
      
      // Centrování plátna - umístění doprostřed
      const centerX = (canvas.width - gridWidthPx) / 2;
      const centerY = (canvas.height - gridHeightPx) / 2;
      
      setPanOffset({ x: centerX, y: centerY });
    }
    
    // Okamžité načtení všech pixelů při prvním načtení
    const loadAllPixels = async () => {
      try {
        console.log('Načítání všech pixelů při inicializaci...');
        const response = await axios.get('/api/pixels', {
          params: {
            startX: 0,
            endX: 9999,
            startY: 0,
            endY: 9999
          }
        });
        
        if (response.data && response.data.pixels) {
          setPixelData(response.data.pixels);
          console.log(`Načteno ${Object.keys(response.data.pixels).length} pixelů při inicializaci`);
        }
      } catch (error) {
        console.error('Chyba při načítání všech pixelů:', error);
      }
    };
    
    // Spustíme načtení všech pixelů
    loadAllPixels();
    
    // Nastavení timeoutu pro automatické skrytí indikátoru načítání po 3 sekundách
    const initialLoadTimeout = setTimeout(() => {
      setIsLoading(false);
      setInitialLoadComplete(true);
      console.log('Počáteční načítání dokončeno');
    }, 3000);
    
    return () => {
      clearTimeout(initialLoadTimeout);
    };
    // Důležité: Závislosti jsou prázdné, aby se efekt spustil pouze jednou při prvním načtení
  }, []);
  
  // Načtení pixelů z API - optimalizováno pro velké plátno
  useEffect(() => {
    // Přeskočíme tento efekt při prvním načtení, protože již načítáme všechny pixely v inicializačním efektu
    if (!initialLoadComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resetování indikátoru načítání po 3 sekundách, aby se nezasekl
    const resetLoadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('Resetování indikátoru načítání po timeoutu');
        setIsLoading(false);
      }
    }, 3000);
    
    // Načtení pixelů pouze při zastavení pohybu
    const debounceTimeout = setTimeout(() => {
      setIsLoading(true); // Začátek načítání
      
      // Výpočet viditelné oblasti
      const visibleStartX = Math.floor(-panOffset.x / (pixelSize * zoomLevel));
      const visibleStartY = Math.floor(-panOffset.y / (pixelSize * zoomLevel));
      const visibleWidth = Math.ceil(canvas.width / (pixelSize * zoomLevel));
      const visibleHeight = Math.ceil(canvas.height / (pixelSize * zoomLevel));
      
      // Rozdělení viditelné oblasti na menší chunky pro paralelní načítání
      const chunkSize = 100; // Velikost jednoho chunku
      const chunks = [];
      
      // Vytvoření chunků pro paralelní načítání
      for (let x = 0; x < visibleWidth; x += chunkSize) {
        for (let y = 0; y < visibleHeight; y += chunkSize) {
          const startX = Math.max(0, visibleStartX + x);
          const startY = Math.max(0, visibleStartY + y);
          const endX = Math.min(gridSize - 1, startX + chunkSize);
          const endY = Math.min(gridSize - 1, startY + chunkSize);
          
          // Přidání chunku pouze pokud je v rámci plátna
          if (startX < gridSize && startY < gridSize) {
            chunks.push({ startX, startY, endX, endY });
          }
        }
      }
      
      // Při nízkém zoomu načteme všechny pixely
      if (zoomLevel <= 0.1) {
        // Načteme všechny pixely
        chunks.length = 0; // Vyčistíme chunky
        chunks.push({ startX: 0, startY: 0, endX: 9999, endY: 9999 });
      }
      
      // Omezení počtu chunků pro lepší výkon
      const maxChunks = 4;
      const priorityChunks = chunks.slice(0, maxChunks);
      
      // Načtení pixelů paralelně
      const loadPixels = async () => {
        try {
          // Paralelní načítání chunků
          const requests = priorityChunks.map(chunk =>
            axios.get('/api/pixels', {
              params: {
                startX: Math.floor(chunk.startX),
                endX: Math.floor(chunk.endX),
                startY: Math.floor(chunk.startY),
                endY: Math.floor(chunk.endY)
              }
            })
          );
          
          // Zpracování všech odpovědí
          const responses = await Promise.all(requests);
          
          // Sloučení všech pixelů do jednoho objektu
          const newPixels = {};
          responses.forEach(response => {
            if (response.data && response.data.pixels) {
              Object.assign(newPixels, response.data.pixels);
            }
          });
          
          // Aktualizace stavu
          setPixelData(prev => ({ ...prev, ...newPixels }));
          
          // Logování pro diagnostiku
          console.log(`Načteno ${Object.keys(newPixels).length} pixelů`);
        } catch (error) {
          // Ignorujeme chyby pro lepší UX
          console.log('Chyba při načítání pixelů:', error);
        } finally {
          // Konec načítání - okamžitě
          setIsLoading(false);
          console.log('Načítání dokončeno');
        }
      };
      
      loadPixels();
    }, 200); // Kratší debounce pro rychlejší reakci
    
    return () => {
      clearTimeout(debounceTimeout);
      clearTimeout(resetLoadingTimeout);
    };
  }, [zoomLevel, panOffset, isLoading, initialLoadComplete]);
  
  // Převod souřadnic myši na souřadnice pixelu - opraveno pro přesné kreslení
  const getPixelCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Přesný výpočet pozice myši v rámci canvasu
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    // Aplikace zoomu a posunu
    const x = Math.floor((mouseX - panOffset.x) / (pixelSize * zoomLevel));
    const y = Math.floor((mouseY - panOffset.y) / (pixelSize * zoomLevel));
    
    // Omezení souřadnic na platný rozsah 0-9999
    const clampedX = Math.max(0, Math.min(9999, x));
    const clampedY = Math.max(0, Math.min(9999, y));
    
    return { x: clampedX, y: clampedY };
  };
  
  // Funkce pro kreslení pixelů
  const drawPixels = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRightMouseDown) return; // Pokud je stisknuté pravé tlačítko, nekreslíme
    
    const { x, y } = getPixelCoordinates(event);
    
    // Kontrola platných souřadnic - omezení na 0-9999 pro kompatibilitu s API
    if (x < 0 || x > 9999 || y < 0 || y > 9999) return;
    
    // Aplikace velikosti štětce
    const brushSizeElement = document.getElementById('brush-size') as HTMLSelectElement;
    const size = brushSizeElement ? parseInt(brushSizeElement.value) : 5;
    const halfSize = Math.floor(size / 2);
    
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      for (let dy = -halfSize; dy <= halfSize; dy++) {
        const px = x + dx;
        const py = y + dy;
        
        // Kontrola platných souřadnic - omezení na 0-9999 pro kompatibilitu s API
        if (px < 0 || px > 9999 || py < 0 || py > 9999) continue;
        
        const key = `${px},${py}`;
        
        // Kontrola, zda pixel není již vlastněn
        if (pixelData[key] && pixelData[key].owner && pixelData[key].owner !== 'demo-preview') {
          // Pixel je již vlastněn, nemůžeme ho vybrat
          // Přidáme vizuální zpětnou vazbu - např. změna kurzoru nebo zvuk
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'not-allowed';
            // Vrátíme kurzor zpět na crosshair po krátké době
            setTimeout(() => {
              if (canvasRef.current) {
                canvasRef.current.style.cursor = 'crosshair';
              }
            }, 300);
          }
          continue;
        }
        
        if (isEraserActive) {
          // Pokud je aktivní guma, odstraníme pixel z výběru
          deselectPixel(px, py);
        } else {
          // Jinak přidáme pixel do výběru
          selectPixel(px, py, selectedColor);
        }
      }
    }
  };
  
  // Funkce pro získání souřadnic pixelu z dotykové události
  const getPixelCoordinatesFromTouch = (touch: React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Přesný výpočet pozice dotyku v rámci canvasu
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;
    
    // Aplikace zoomu a posunu
    const x = Math.floor((touchX - panOffset.x) / (pixelSize * zoomLevel));
    const y = Math.floor((touchY - panOffset.y) / (pixelSize * zoomLevel));
    
    // Omezení souřadnic na platný rozsah 0-9999
    const clampedX = Math.max(0, Math.min(9999, x));
    const clampedY = Math.max(0, Math.min(9999, y));
    
    return { x: clampedX, y: clampedY };
  };
  
  // Funkce pro kreslení pixelů pomocí dotyku
  const drawPixelsTouch = (touch: React.Touch) => {
    const { x, y } = getPixelCoordinatesFromTouch(touch);
    
    // Kontrola platných souřadnic - omezení na 0-9999 pro kompatibilitu s API
    if (x < 0 || x > 9999 || y < 0 || y > 9999) return;
    
    // Aplikace velikosti štětce
    const brushSizeElement = document.getElementById('brush-size') as HTMLSelectElement;
    const size = brushSizeElement ? parseInt(brushSizeElement.value) : 5;
    const halfSize = Math.floor(size / 2);
    
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      for (let dy = -halfSize; dy <= halfSize; dy++) {
        const px = x + dx;
        const py = y + dy;
        
        // Kontrola platných souřadnic - omezení na 0-9999 pro kompatibilitu s API
        if (px < 0 || px > 9999 || py < 0 || py > 9999) continue;
        
        const key = `${px},${py}`;
        
        // Kontrola, zda pixel není již vlastněn
        if (pixelData[key] && pixelData[key].owner && pixelData[key].owner !== 'demo-preview') {
          continue;
        }
        
        if (isEraserActive) {
          // Pokud je aktivní guma, odstraníme pixel z výběru
          deselectPixel(px, py);
        } else {
          // Jinak přidáme pixel do výběru
          selectPixel(px, py, selectedColor);
        }
      }
    }
  };
  
  // Event handlery pro dotykové události
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Zabránění výchozímu chování prohlížeče
    
    if (e.touches.length === 1) {
      // Jeden prst - kreslení nebo posun
      setIsTouching(true);
      const touch = e.touches[0];
      setTouchStartPoint({ x: touch.clientX, y: touch.clientY });
      setTouchStartPan({ ...panOffset });
      
      // Pokud je aktivní režim kreslení, začneme kreslit
      if (!isRightMouseDown) {
        setIsTouchDrawing(true);
        drawPixelsTouch(touch);
      }
      
      setLastTouchPos({ x: touch.clientX, y: touch.clientY });
    } 
    else if (e.touches.length === 2) {
      // Dva prsty - zoom
      setIsTouchDrawing(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setTouchStartDistance(distance);
      setTouchStartZoom(zoomLevel);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Zabránění výchozímu chování prohlížeče
    
    if (e.touches.length === 1 && isTouching) {
      const touch = e.touches[0];
      
      // Pokud jsme v režimu kreslení
      if (isTouchDrawing) {
        // Kreslení pouze pokud se prst posunul dostatečně daleko od poslední pozice
        if (lastTouchPos) {
          const dx = touch.clientX - lastTouchPos.x;
          const dy = touch.clientY - lastTouchPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) { // Minimální vzdálenost pro kreslení
            drawPixelsTouch(touch);
            setLastTouchPos({ x: touch.clientX, y: touch.clientY });
          }
        } else {
          drawPixelsTouch(touch);
          setLastTouchPos({ x: touch.clientX, y: touch.clientY });
        }
      } 
      // Jinak posun plátna
      else {
        const dx = touch.clientX - touchStartPoint.x;
        const dy = touch.clientY - touchStartPoint.y;
        
        // Omezení velikosti posunu pro prevenci problémů
        const limitedDx = Math.max(-50, Math.min(50, dx));
        const limitedDy = Math.max(-50, Math.min(50, dy));
        
        // Výpočet nových hodnot posunu
        const newX = touchStartPan.x + limitedDx;
        const newY = touchStartPan.y + limitedDy;
        
        // Kontrola, zda nové hodnoty jsou platné
        if (isNaN(newX) || isNaN(newY) || !isFinite(newX) || !isFinite(newY)) {
          return;
        }
        
        // Získání rozměrů canvasu
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Výpočet hranic pro omezení posunu
        const minVisibleWidth = Math.max(300, canvas.width * 0.3);
        const minVisibleHeight = Math.max(300, canvas.height * 0.3);
        
        const gridWidthPx = 10000 * pixelSize * zoomLevel;
        const gridHeightPx = 10000 * pixelSize * zoomLevel;
        
        const maxPanLeft = canvas.width - minVisibleWidth;
        const maxPanTop = canvas.height - minVisibleHeight;
        const minPanRight = -(gridWidthPx - minVisibleWidth);
        const minPanBottom = -(gridHeightPx - minVisibleHeight);
        
        // Aplikace omezení na nové hodnoty posunu
        const constrainedX = Math.min(maxPanLeft, Math.max(minPanRight, newX));
        const constrainedY = Math.min(maxPanTop, Math.max(minPanBottom, newY));
        
        // Aplikace nových hodnot s omezeními
        setPanOffset({ x: constrainedX, y: constrainedY });
      }
    } 
    else if (e.touches.length === 2 && touchStartDistance !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Výpočet nového zoomu na základě změny vzdálenosti mezi prsty
      const zoomFactor = distance / touchStartDistance;
      const newZoom = touchStartZoom * zoomFactor;
      
      // Omezení zoomu na rozumné hodnoty
      const MIN_ZOOM = 0.05;
      const MAX_ZOOM = 3.0;
      const constrainedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
      
      // Kontrola platnosti hodnoty
      if (isNaN(constrainedZoom) || !isFinite(constrainedZoom) || constrainedZoom <= 0) {
        return;
      }
      
      // Získání středu mezi dvěma dotyky
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Převod pozice na canvas souřadnice
      const canvasX = (centerX - rect.left) * scaleX;
      const canvasY = (centerY - rect.top) * scaleY;
      
      // Převod na světové souřadnice
      const worldX = (canvasX - panOffset.x) / (pixelSize * zoomLevel);
      const worldY = (canvasY - panOffset.y) / (pixelSize * zoomLevel);
      
      // Výpočet nového posunu
      const newPanX = canvasX - worldX * pixelSize * constrainedZoom;
      const newPanY = canvasY - worldY * pixelSize * constrainedZoom;
      
      // Kontrola platnosti hodnot
      if (isNaN(newPanX) || isNaN(newPanY) || !isFinite(newPanX) || !isFinite(newPanY)) {
        return;
      }
      
      // Výpočet hranic pro omezení posunu
      const minVisibleWidth = Math.max(300, canvas.width * 0.3);
      const minVisibleHeight = Math.max(300, canvas.height * 0.3);
      
      const gridWidthPx = 10000 * pixelSize * constrainedZoom;
      const gridHeightPx = 10000 * pixelSize * constrainedZoom;
      
      const maxPanLeft = canvas.width - minVisibleWidth;
      const maxPanTop = canvas.height - minVisibleHeight;
      const minPanRight = -(gridWidthPx - minVisibleWidth);
      const minPanBottom = -(gridHeightPx - minVisibleHeight);
      
      // Aplikace omezení na nové hodnoty posunu
      const constrainedX = Math.min(maxPanLeft, Math.max(minPanRight, newPanX));
      const constrainedY = Math.min(maxPanTop, Math.max(minPanBottom, newPanY));
      
      // Aplikace nových hodnot
      setZoomLevel(constrainedZoom);
      setPanOffset({ x: constrainedX, y: constrainedY });
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Zabránění výchozímu chování prohlížeče
    
    // Pokud už nejsou žádné dotyky, resetujeme všechny stavy
    if (e.touches.length === 0) {
      setIsTouching(false);
      setIsTouchDrawing(false);
      setTouchStartDistance(null);
      setLastTouchPos(null);
    }
    // Pokud zůstal jeden prst, aktualizujeme počáteční pozici
    else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStartPoint({ x: touch.clientX, y: touch.clientY });
      setTouchStartPan({ ...panOffset });
      setTouchStartDistance(null);
    }
  };
  
  // Event handlery pro myš
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // Levé tlačítko
      setIsMouseDown(true);
      if (!isRightMouseDown) { // Kreslíme jen pokud není aktivní pravé tlačítko
        drawPixels(e);
      }
    } else if (e.button === 2) { // Pravé tlačítko
      e.preventDefault();
      setIsRightMouseDown(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRightMouseDown) { // Posun plátna
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      
      // Omezení velikosti posunu pro prevenci problémů
      const limitedDx = Math.max(-50, Math.min(50, dx));
      const limitedDy = Math.max(-50, Math.min(50, dy));
      
      // Uložení předchozí pozice pro případ chyby
      const prevPanOffset = { ...panOffset };
      
      // Výpočet nových hodnot posunu
      const newX = panOffset.x + limitedDx;
      const newY = panOffset.y + limitedDy;
      
      // Kontrola, zda nové hodnoty jsou platné
      if (isNaN(newX) || isNaN(newY) || !isFinite(newX) || !isFinite(newY)) {
        console.error('Neplatné hodnoty posunu:', { newX, newY });
        // Zachování původních hodnot
        setLastMousePos({ x: e.clientX, y: e.clientY });
        return;
      }
      
      // Získání rozměrů canvasu
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Výpočet hranic pro omezení posunu
      // Zajistíme, že významná část gridu (minimálně 30% šířky/výšky canvasu) zůstane viditelná na obrazovce
      const minVisibleWidth = Math.max(300, canvas.width * 0.3);
      const minVisibleHeight = Math.max(300, canvas.height * 0.3);
      
      // Výpočet maximálních hodnot posunu, které zajistí, že grid zůstane viditelný
      const gridWidthPx = 10000 * pixelSize * zoomLevel;
      const gridHeightPx = 10000 * pixelSize * zoomLevel;
      
      // Omezení posunu tak, aby grid nemohl být posunut mimo viditelnou oblast
      const maxPanLeft = canvas.width - minVisibleWidth;
      const maxPanTop = canvas.height - minVisibleHeight;
      const minPanRight = -(gridWidthPx - minVisibleWidth);
      const minPanBottom = -(gridHeightPx - minVisibleHeight);
      
      // Aplikace omezení na nové hodnoty posunu
      const constrainedX = Math.min(maxPanLeft, Math.max(minPanRight, newX));
      const constrainedY = Math.min(maxPanTop, Math.max(minPanBottom, newY));
      
      // Aplikace nových hodnot s omezeními
      setPanOffset({ x: constrainedX, y: constrainedY });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isMouseDown) { // Kreslení
      drawPixels(e);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsMouseDown(false);
    } else if (e.button === 2) {
      setIsRightMouseDown(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    }
  };
  
  const handleMouseLeave = () => {
    setIsMouseDown(false);
    setIsRightMouseDown(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    return false;
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Pevné limity pro zoom - umožnění většího oddálení, ale se zajištěním viditelnosti mřížky
    const MIN_ZOOM = 0.05; // Nižší minimální zoom, ale s adaptivním vykreslením mřížky
    const MAX_ZOOM = 3.0;
    
    // Výpočet nové úrovně přiblížení s menším krokem
    let newZoom = zoomLevel;
    if (e.deltaY < 0) {
      // Přiblížení - menší krok pro plynulejší zoom
      newZoom = Math.min(MAX_ZOOM, zoomLevel * 1.05);
    } else {
      // Oddálení - menší krok pro plynulejší zoom
      newZoom = Math.max(MIN_ZOOM, zoomLevel / 1.05);
    }
    
    // Kontrola platnosti hodnoty
    if (isNaN(newZoom) || !isFinite(newZoom) || newZoom <= 0) {
      console.error('Neplatná hodnota zoomu:', newZoom);
      return; // Neprovádíme žádnou změnu
    }
    
    // Získání pozice myši v rámci canvasu
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Převod pozice myši na světové souřadnice (souřadnice v rámci gridu)
    const worldX = (mouseX - panOffset.x) / (pixelSize * zoomLevel);
    const worldY = (mouseY - panOffset.y) / (pixelSize * zoomLevel);
    
    // Výpočet nového posunu tak, aby pozice pod myší zůstala na stejném místě
    const newPanX = mouseX - worldX * pixelSize * newZoom;
    const newPanY = mouseY - worldY * pixelSize * newZoom;
    
    // Kontrola platnosti hodnot
    if (isNaN(newPanX) || isNaN(newPanY) || !isFinite(newPanX) || !isFinite(newPanY)) {
      console.error('Neplatné hodnoty posunu:', { newPanX, newPanY });
      return; // Neprovádíme žádnou změnu
    }
    
    // Výpočet hranic pro omezení posunu - zvětšení minimální viditelné oblasti
    const minVisibleWidth = Math.max(300, canvas.width * 0.3);
    const minVisibleHeight = Math.max(300, canvas.height * 0.3);
    
    // Výpočet velikosti gridu v pixelech při novém zoomu
    const gridWidthPx = 10000 * pixelSize * newZoom;
    const gridHeightPx = 10000 * pixelSize * newZoom;
    
    // Omezení posunu tak, aby grid nemohl být posunut mimo viditelnou oblast
    const maxPanLeft = canvas.width - minVisibleWidth;
    const maxPanTop = canvas.height - minVisibleHeight;
    const minPanRight = -(gridWidthPx - minVisibleWidth);
    const minPanBottom = -(gridHeightPx - minVisibleHeight);
    
    // Aplikace omezení na nové hodnoty posunu
    const constrainedX = Math.min(maxPanLeft, Math.max(minPanRight, newPanX));
    const constrainedY = Math.min(maxPanTop, Math.max(minPanBottom, newPanY));
    
    // Aplikace nových hodnot s omezeními
    setZoomLevel(newZoom);
    setPanOffset({ x: constrainedX, y: constrainedY });
  };
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Indikátor načítání */}
      {isLoading && (
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Canvas pro kreslení */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
      
      {/* Tlačítka pro přiblížení a oddálení - mobilní verze */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          className="bg-white p-2 rounded-full shadow-md flex items-center justify-center w-10 h-10"
          onClick={() => changeZoomLevel(0.2)}
          aria-label="Přiblížit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          className="bg-white p-2 rounded-full shadow-md flex items-center justify-center w-10 h-10"
          onClick={() => changeZoomLevel(-0.2)}
          aria-label="Oddálit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>
      
      {/* Výběr velikosti štětce - posunutý nahoru pro mobilní zobrazení */}
      <div className="absolute bottom-20 md:bottom-4 left-4 bg-white p-2 rounded shadow-md">
        <label htmlFor="brush-size" className="mr-2 font-bold text-black">Velikost štětce:</label>
        <select id="brush-size" className="p-1 border rounded" defaultValue="5">
          <option value="1">1x1</option>
          <option value="3">3x3</option>
          <option value="5">5x5</option>
          <option value="7">7x7</option>
          <option value="10">10x10</option>
        </select>
      </div>
      
      {/* Tlačítko pro přepínání viditelnosti mřížky - posunuté nahoru pro mobilní zobrazení */}
      <button
        className={`absolute bottom-20 md:bottom-4 left-64 p-2 rounded ${
          isGridVisible ? 'bg-blue-500 text-white' : 'bg-white text-black'
        }`}
        onClick={() => setIsGridVisible(!isGridVisible)}
      >
        {isGridVisible ? 'Skrýt mřížku' : 'Zobrazit mřížku'}
      </button>
      
      {/* Instrukce pro mobilní uživatele */}
      <div className="md:hidden absolute top-16 left-4 right-4 bg-white p-2 rounded shadow-md text-xs text-center">
        Kreslete dotykem na plátno. Pro posun plátna použijte tažení jedním prstem. Pro přiblížení/oddálení použijte gesto dvěma prsty nebo tlačítka + a -.
      </div>
    </div>
  );
}
