'use client';

import { useEffect, useState } from 'react';

export default function InitDatabase() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        const response = await fetch('/api/init-db');
        const data = await response.json();
        
        if (data.success) {
          console.log('Databáze byla úspěšně inicializována');
          setInitialized(true);
        } else {
          console.error('Chyba při inicializaci databáze:', data.error);
          setError('Chyba při inicializaci databáze');
        }
      } catch (err) {
        console.error('Neočekávaná chyba při inicializaci databáze:', err);
        setError('Neočekávaná chyba při inicializaci databáze');
      }
    };

    initDb();
  }, []);

  // Komponenta nevrací žádný viditelný UI
  return null;
}