import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'bitcoin';

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch data from CoinGecko');
    }

    const data = await response.json();
    const coinData = data[symbol];

    return NextResponse.json({
      symbol,
      price: coinData.usd,
      priceChange24h: coinData.usd_24h_change,
      volume24h: coinData.usd_24h_vol,
      marketCap: coinData.usd_market_cap,
      lastUpdated: new Date(coinData.last_updated_at * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
} 