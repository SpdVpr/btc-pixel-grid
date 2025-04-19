'use client';

import dynamic from 'next/dynamic';

// Dynamický import klientské komponenty pro inicializaci databáze
const InitDatabase = dynamic(() => import('@/components/InitDatabase'), {
  ssr: false,
});

export default function ClientInitDatabase() {
  return <InitDatabase />;
}