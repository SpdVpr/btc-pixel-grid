import { NextRequest, NextResponse } from 'next/server';

// Cache the price for 5 minutes to avoid excessive API calls
let cachedPrice: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request: NextRequest) {
  try {
    const currentTime = Date.now();
    
    // Return cached price if it's still valid
    if (cachedPrice && currentTime - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        price: cachedPrice,
        cached: true,
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }
    
    // Fetch new price from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { next: { revalidate: 300 } } // Revalidate every 5 minutes
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Bitcoin price: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.bitcoin || !data.bitcoin.usd) {
      throw new Error('Invalid response format from CoinGecko API');
    }
    
    // Update cache
    cachedPrice = data.bitcoin.usd;
    lastFetchTime = currentTime;
    
    return NextResponse.json({
      price: cachedPrice,
      cached: false,
      lastUpdated: new Date(lastFetchTime).toISOString()
    });
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    
    // If we have a cached price, return it even if it's expired
    if (cachedPrice) {
      return NextResponse.json({
        price: cachedPrice,
        cached: true,
        lastUpdated: new Date(lastFetchTime).toISOString(),
        error: 'Failed to update price, using cached value'
      });
    }
    
    // Otherwise, return an error
    return NextResponse.json(
      { error: 'Failed to fetch Bitcoin price' },
      { status: 500 }
    );
  }
}
