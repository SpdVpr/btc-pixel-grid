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
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [zoomLevel, panOffset, pixelData, selectedPixels, selectedColor, pixelCache, isGridVisible]);
  
  // Efekt pro nastavení počátečního stavu načítání a centrování plátna
  useEffect(() => {
    // Nastavení počátečního stavu načítání na true
    setIsLoading(true);
    
    // Centrování plátna při načtení
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
    
    // Nastavení timeoutu pro automatické skrytí indikátoru načítání po 3 sekundách
    const initialLoadTimeout = setTimeout(() => {
      setIsLoading(false);
      setInitialLoadComplete(true);
      console.log('Počáteční načítání dokončeno');
    }, 3000);
    
    return () => {
      clearTimeout(initialLoadTimeout);
    };
  }, [zoomLevel, pixelSize]);
  
  // Načtení pixelů z API - optimalizováno pro velké plátno
  useEffect(() => {
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
      
      // Omezení počtu chunků pro lepší výkon
      const maxChunks = 4; // Maximální počet chunků načítaných najednou
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
  }, [zoomLevel, panOffset, isLoading]);
  
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
  
  // Event handlery
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
      />
      
      {/* Výběr velikosti štětce */}
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded">
        <label htmlFor="brush-size" className="mr-2">Velikost štětce:</label>
        <select id="brush-size" className="p-1 border rounded" defaultValue="5">
          <option value="1">1x1</option>
          <option value="3">3x3</option>
          <option value="5">5x5</option>
          <option value="7">7x7</option>
          <option value="9">9x9</option>
        </select>
      </div>
      
      {/* Tlačítko pro přepínání viditelnosti mřížky */}
      <button
        className={`absolute bottom-4 left-64 p-2 rounded ${
          isGridVisible ? 'bg-blue-500 text-white' : 'bg-white text-black'
        }`}
        onClick={() => setIsGridVisible(!isGridVisible)}
      >
        {isGridVisible ? 'Skrýt mřížku' : 'Zobrazit mřížku'}
      </button>
    </div>
  );
}
