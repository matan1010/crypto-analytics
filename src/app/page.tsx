'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import CryptoChart from '@/components/CryptoChart';
import AIAssistant from '@/components/AIAssistant';
import MarketSummary from '@/components/MarketSummary';
import { AlertSystem } from '@/components/AlertSystem';
import { PredictionView } from '@/components/PredictionView';
import { fetchCandleData } from '@/utils/crypto';
import { CandleData } from '@/types/crypto';

export default function Home() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const lastFetchTimeRef = useRef<number>(0);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [showPredictions, setShowPredictions] = useState(true);

  // Fetch data with React Query
  const { data: chartData = [], isLoading, error, refetch } = useQuery<CandleData[]>({
    queryKey: ['candleData', symbol, timeframe],
    queryFn: () => fetchCandleData(symbol, timeframe),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Trigger manual refetch with rate limiting
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 30000) return;
      lastFetchTimeRef.current = now;
      
      setShouldRefetch(true);
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Handle the actual refetch
  useEffect(() => {
    if (shouldRefetch) {
      refetch();
      setShouldRefetch(false);
    }
  }, [shouldRefetch, refetch]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-center md:text-left">
            <span className="text-blue-500">Crypto</span>Analytics
          </h1>
          
          <div className="flex flex-wrap justify-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="BTCUSDT">Bitcoin (BTC/USDT)</option>
              <option value="ETHUSDT">Ethereum (ETH/USDT)</option>
              <option value="BNBUSDT">Binance Coin (BNB/USDT)</option>
              <option value="ADAUSDT">Cardano (ADA/USDT)</option>
              <option value="SOLUSDT">Solana (SOL/USDT)</option>
            </select>
            
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="1m">1 דקה</option>
              <option value="5m">5 דקות</option>
              <option value="15m">15 דקות</option>
              <option value="1h">שעה</option>
              <option value="4h">4 שעות</option>
              <option value="1d">יום</option>
            </select>
            
            <button
              onClick={() => setShowPredictions(!showPredictions)}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                showPredictions 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {showPredictions ? 'הסתר תחזיות' : 'הצג תחזיות'}
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-10 bg-red-900/20 rounded-lg border border-red-800">
            <h3 className="text-xl font-bold text-red-500 mb-2">שגיאה בטעינת הנתונים</h3>
            <p className="text-gray-400">אנא נסה שוב מאוחר יותר או בחר מטבע אחר</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CryptoChart data={chartData} symbol={symbol} timeframe={timeframe} />
              
              <AlertSystem chartData={chartData} symbol={symbol} />
              
              {showPredictions && (
                <PredictionView chartData={chartData} />
              )}
            </div>
            
            <div className="space-y-6">
              <AIAssistant chartData={chartData} symbol={symbol} />
              <MarketSummary chartData={chartData} symbol={symbol} />
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-4 px-6 mt-10">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2025 CryptoAnalytics - כל הנתונים מסופקים למטרות מידע בלבד ואינם מהווים ייעוץ השקעות</p>
        </div>
      </footer>
    </main>
  );
}
