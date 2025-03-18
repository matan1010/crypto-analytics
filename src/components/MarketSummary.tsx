import React, { useMemo } from 'react';
import { CandleData } from '@/types/crypto';
import { calculateRSI, calculateSMA } from '@/utils/technicalAnalysis';

interface MarketSummaryProps {
  chartData: CandleData[];
  symbol: string;
}

const MarketSummary: React.FC<MarketSummaryProps> = ({ chartData, symbol }) => {
  const marketData = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return null;
    }
    
    const lastCandle = chartData[chartData.length - 1];
    const prevDayCandle = chartData[chartData.length - 25]; // Approximate for 1 day ago
    
    const priceChange = lastCandle.close - prevDayCandle.close;
    const priceChangePercent = (priceChange / prevDayCandle.close) * 100;
    
    // Calculate 24h volume (sum of last 24 candles if hourly)
    const volume = chartData
      .slice(-24)
      .reduce((sum, candle) => sum + candle.volume, 0);
    
    return {
      lastPrice: lastCandle.close,
      priceChange,
      priceChangePercent,
      volume,
      high24h: Math.max(...chartData.slice(-24).map(c => c.high)),
      low24h: Math.min(...chartData.slice(-24).map(c => c.low)),
    };
  }, [chartData]);
  
  const technicalIndicators = useMemo(() => {
    if (!chartData || chartData.length < 200) {
      return null;
    }
    
    return {
      rsi: calculateRSI(chartData.slice(-14)),
      sma50: calculateSMA(chartData.slice(-50), 50),
      sma200: calculateSMA(chartData.slice(-200), 200),
    };
  }, [chartData]);

  if (!marketData) {
    return <div className="bg-gray-900 rounded-lg p-4 shadow-lg">טוען נתוני שוק...</div>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">סיכום שוק</h2>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">מחיר נוכחי:</span>
          <span className="text-white font-medium">
            ${marketData.lastPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">שינוי 24 שעות:</span>
          <span
            className={
              marketData.priceChangePercent >= 0
                ? 'text-green-500 font-medium'
                : 'text-red-500 font-medium'
            }
          >
            {marketData.priceChangePercent >= 0 ? '+' : ''}
            {marketData.priceChangePercent.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">מחזור מסחר 24 שעות:</span>
          <span className="text-white font-medium">
            ${marketData.volume.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">גבוה 24 שעות:</span>
          <span className="text-white font-medium">
            ${marketData.high24h.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">נמוך 24 שעות:</span>
          <span className="text-white font-medium">
            ${marketData.low24h.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        
        {technicalIndicators && (
          <>
            <div className="border-t border-gray-800 my-3"></div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">RSI (14):</span>
              <span
                className={
                  technicalIndicators.rsi > 70
                    ? 'text-red-500 font-medium'
                    : technicalIndicators.rsi < 30
                    ? 'text-green-500 font-medium'
                    : 'text-white font-medium'
                }
              >
                {technicalIndicators.rsi.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">SMA 50:</span>
              <span
                className={
                  marketData.lastPrice > technicalIndicators.sma50
                    ? 'text-green-500 font-medium'
                    : 'text-red-500 font-medium'
                }
              >
                ${technicalIndicators.sma50.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">SMA 200:</span>
              <span
                className={
                  marketData.lastPrice > technicalIndicators.sma200
                    ? 'text-green-500 font-medium'
                    : 'text-red-500 font-medium'
                }
              >
                ${technicalIndicators.sma200.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarketSummary; 