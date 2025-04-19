# 1 BTC Pixel Grid

Webová aplikace, kde 100 000 000 pixelů = 1 Bitcoin (každý pixel = 1 satoshi).

## O projektu

1 BTC Pixel Grid je webová aplikace, která umožňuje uživatelům nakupovat pixely pomocí Lightning Network plateb. Každý pixel stojí 1 satoshi (0.00000001 BTC) a může mít vlastní barvu a URL odkaz.

Hlavní funkce:
- Interaktivní grid s 10 000 x 10 000 pixely (celkem 100 milionů pixelů)
- Nákup pixelů přes Lightning Network (OpenNode API)
- Možnost nastavit barvu a URL odkaz pro každý pixel
- Statistiky o prodaných pixelech a vybraných satoshi
- Efektivní vykreslování velkého množství pixelů pomocí virtualizace a chunkingu

## Technický stack

- **Frontend + Backend**: Next.js 15 (App Router)
- **Databáze**: Vercel Postgres
- **Platební systém**: OpenNode API pro Lightning Network platby
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Instalace a spuštění

### Požadavky

- Node.js 18+ a npm/yarn/pnpm
- Účet na Vercel (pro Vercel Postgres)
- Účet na OpenNode (pro Lightning Network platby)

### Kroky instalace

1. Naklonujte repozitář:
   ```bash
   git clone https://github.com/vas-projekt/btc-pixel-grid.git
   cd btc-pixel-grid
   ```

2. Nainstalujte závislosti:
   ```bash
   npm install
   # nebo
   yarn install
   # nebo
   pnpm install
   ```

3. Vytvořte soubor `.env.local` podle vzoru `.env.local.example` a vyplňte potřebné proměnné prostředí:
   ```
   # Vercel Postgres databáze
   POSTGRES_URL=...
   POSTGRES_PRISMA_URL=...
   POSTGRES_URL_NON_POOLING=...
   POSTGRES_USER=...
   POSTGRES_HOST=...
   POSTGRES_PASSWORD=...
   POSTGRES_DATABASE=...

   # OpenNode API (Lightning Network platby)
   OPENNODE_API_KEY=...
   OPENNODE_WEBHOOK_SECRET=...

   # Nastavení aplikace
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Spusťte vývojový server:
   ```bash
   npm run dev
   # nebo
   yarn dev
   # nebo
   pnpm dev
   ```

5. Otevřete [http://localhost:3000](http://localhost:3000) ve vašem prohlížeči.

## Nasazení na Vercel

Projekt je připraven pro nasazení na Vercel. Následující kroky vás provedou procesem nasazení:

### 1. Příprava repozitáře

Ujistěte se, že máte váš kód v Git repozitáři (GitHub, GitLab nebo Bitbucket):

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <URL vašeho repozitáře>
git push -u origin main
```

### 2. Vytvoření Vercel projektu

1. Přihlaste se na [Vercel](https://vercel.com)
2. Klikněte na "Add New..." → "Project"
3. Importujte váš Git repozitář
4. Nakonfigurujte projekt:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: next build (výchozí)
   - Output Directory: .next (výchozí)

### 3. Nastavení Vercel Postgres databáze

1. V Dashboardu Vercel přejděte na záložku "Storage"
2. Klikněte na "Create Database" a vyberte Postgres
3. Postupujte podle průvodce nastavením
4. Vercel automaticky vygeneruje potřebné proměnné prostředí pro připojení k databázi

### 4. Nastavení proměnných prostředí

V nastavení projektu na Vercel přidejte tyto proměnné prostředí:

```
# Vercel Postgres proměnné budou přidány automaticky při vytvoření databáze
# POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, POSTGRES_USER, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE

# OpenNode API (Lightning Network platby)
OPENNODE_API_KEY=váš_opennode_api_klíč
OPENNODE_WEBHOOK_SECRET=váš_opennode_webhook_secret

# URL aplikace (bude vaše Vercel URL)
NEXT_PUBLIC_APP_URL=https://váš-projekt.vercel.app
```

### 5. Aktualizace webhook URL pro OpenNode

Po nasazení je potřeba aktualizovat webhook URL v OpenNode:

1. Přihlaste se do vašeho OpenNode účtu
2. Přejděte do nastavení API
3. Aktualizujte webhook URL na: `https://váš-projekt.vercel.app/api/payment/webhook`

### 6. Inicializace databáze

Při prvním nasazení se databáze inicializuje automaticky díky komponentě `InitDatabase`, kterou jsme přidali do projektu. Tato komponenta zajistí vytvoření potřebných tabulek při prvním spuštění aplikace.

### 7. Ověření nasazení

Po úspěšném nasazení:
1. Otevřete vaši aplikaci na `https://váš-projekt.vercel.app`
2. Zkontrolujte, zda se data správně načítají
3. Otestujte funkcionalitu výběru a nákupu pixelů

## Struktura projektu

- `src/app` - Next.js App Router stránky a API endpointy
- `src/components` - React komponenty
- `src/lib` - Sdílené utility, databázové funkce a hooks
- `src/lib/db` - Databázové modely a funkce
- `public` - Statické soubory

## API Endpointy

- `GET /api/pixels` - Získání dat o pixelech (s možností filtrování)
- `POST /api/pixels/select` - Výběr pixelů pro nákup
- `POST /api/payment/create` - Vytvoření Lightning Network faktury
- `GET /api/payment/status/:invoiceId` - Kontrola stavu platby
- `POST /api/payment/webhook` - Webhook pro OpenNode notifikace
- `GET /api/statistics` - Získání statistik o prodaných pixelech

## Licence

Tento projekt je licencován pod MIT licencí.

## Řešení problémů při nasazení na Vercel

Pokud narazíte na problémy při nasazení aplikace na Vercel, zde jsou řešení nejčastějších problémů:

### Problém s připojením k databázi

**Symptom:** Chyba "Could not connect to database" nebo podobná chyba v logách.

**Řešení:**
1. Zkontrolujte, zda jsou správně nastaveny všechny proměnné prostředí pro Postgres databázi
2. Ujistěte se, že vaše Vercel Postgres databáze je aktivní
3. Zkuste ručně spustit inicializaci databáze navštívením `/api/init-db` endpointu

### Problém s OpenNode webhooky

**Symptom:** Platby jsou vytvořeny, ale nejsou zpracovány po zaplacení.

**Řešení:**
1. Zkontrolujte, zda je správně nastavena proměnná `OPENNODE_WEBHOOK_SECRET`
2. Ověřte, že webhook URL v OpenNode dashboardu je správně nastavena na `https://váš-projekt.vercel.app/api/payment/webhook`
3. Zkontrolujte logy v OpenNode dashboardu, zda jsou webhooky odesílány a jaké jsou odpovědi

### Problém s CORS při volání API

**Symptom:** Chyby CORS v konzoli prohlížeče při volání API endpointů.

**Řešení:**
1. Ujistěte se, že `NEXT_PUBLIC_APP_URL` je správně nastavena na vaši Vercel doménu
2. Zkontrolujte, zda `vercel.json` obsahuje správné CORS hlavičky pro webhook endpoint

### Problém s inicializací databáze

**Symptom:** Aplikace se načte, ale nezobrazují se žádná data nebo se zobrazuje chyba databáze.

**Řešení:**
1. Navštivte endpoint `/api/init-db` ve vašem prohlížeči pro ruční inicializaci databáze
2. Zkontrolujte logy v Vercel dashboardu pro případné chyby při inicializaci
3. Pokud problém přetrvává, zkuste odstranit a znovu vytvořit Postgres databázi v Vercel dashboardu

### Obecné problémy s nasazením

**Symptom:** Build selže nebo aplikace nefunguje správně po nasazení.

**Řešení:**
1. Zkontrolujte build logy v Vercel dashboardu pro konkrétní chyby
2. Ujistěte se, že všechny závislosti jsou správně uvedeny v `package.json`
3. Zkuste lokálně spustit `next build` pro identifikaci problémů před nasazením
4. Pokud problém přetrvává, zkuste nasadit aplikaci znovu s možností "Override" v Vercel dashboardu
