import { createTables } from './db';

// Funkce pro inicializaci databáze
export async function initDatabase() {
  try {
    console.log('Inicializace databáze...');
    const result = await createTables();
    
    if (result.success) {
      console.log('Databáze byla úspěšně inicializována.');
    } else {
      console.error('Chyba při inicializaci databáze:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Neočekávaná chyba při inicializaci databáze:', error);
    return { success: false, error };
  }
}