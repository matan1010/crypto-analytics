import { CandleData } from '@/types/crypto';

/**
 * Fetches candlestick data from Binance API
 * @param symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @param timeframe - Candlestick timeframe (e.g., '1h', '1d')
 * @returns Promise with candlestick data
 */
export async function fetchCandleData(symbol: string, timeframe: string): Promise<CandleData[]> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=1000`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch candlestick data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.map((candle: any[]) => ({
      time: candle[0] as number,
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  } catch (error) {
    console.error('Error fetching candle data:', error);
    throw error;
  }
} 