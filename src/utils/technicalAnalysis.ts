/**
 * Technical Analysis Utilities
 * 
 * This file contains functions for calculating various technical indicators
 * used in crypto trading analysis.
 */

import { CandleData } from '../types/crypto';

//=============================================================================
// BASIC INDICATORS
//=============================================================================

/**
 * Calculate Simple Moving Average
 * @param data Array of candle data
 * @param period Period for calculation (defaults to data length)
 * @returns The SMA value
 */
export const calculateSMA = (data: CandleData[], period: number): number => {
  if (data.length < period) {
    return data[data.length - 1]?.close || 0;
  }

  const sum = data.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
  return sum / period;
};

/**
 * Calculate Exponential Moving Average
 * @param data Array of candle data
 * @param period Period for calculation (defaults to data length)
 * @returns The EMA value
 */
export const calculateEMA = (data: CandleData[], period?: number) => {
  const p = period || data.length;
  const multiplier = 2 / (p + 1);
  let ema = data[0].close;
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
  }
  
  return ema;
};

/**
 * Calculate Relative Strength Index
 * @param data Array of candle data
 * @param period Period for calculation (default: 14)
 * @returns The RSI value (0-100)
 */
export const calculateRSI = (data: CandleData[], period = 14): number => {
  if (data.length < period + 1) {
    return 50; // Default value if not enough data
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate subsequent values using smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

//=============================================================================
// VOLATILITY INDICATORS
//=============================================================================

/**
 * Calculate Bollinger Bands
 * @param data Array of candle data
 * @param period Period for calculation (default: 20)
 * @param stdDev Number of standard deviations (default: 2)
 * @returns Object containing upper, middle, and lower bands
 */
export const calculateBollingerBands = (data: CandleData[], period = 20, stdDev = 2) => {
  const sma = calculateSMA(data, period);
  const standardDeviation = Math.sqrt(
    data.reduce((sum, candle) => sum + Math.pow(candle.close - sma, 2), 0) / period
  );
  
  return {
    upper: sma + (stdDev * standardDeviation),
    middle: sma,
    lower: sma - (stdDev * standardDeviation),
    stdDev: standardDeviation
  };
};

/**
 * Calculate Average True Range (ATR)
 * @param data Array of candle data
 * @param period Period for calculation (default: 14)
 * @returns The ATR value
 */
export const calculateATR = (data: CandleData[], period = 14) => {
  const trueRanges = data.slice(1).map((candle, i) => {
    const prev = data[i];
    const tr1 = candle.high - candle.low;
    const tr2 = Math.abs(candle.high - prev.close);
    const tr3 = Math.abs(candle.low - prev.close);
    return Math.max(tr1, tr2, tr3);
  });

  return trueRanges.reduce((sum, tr) => sum + tr, 0) / period;
};

/**
 * Calculate price volatility
 * @param data Array of candle data
 * @param period Period for calculation (default: 20)
 * @returns Volatility as a percentage
 */
export const calculateVolatility = (data: CandleData[], period = 20) => {
  const returns = data.slice(1).map((candle, i) => 
    (candle.close - data[i].close) / data[i].close
  );
  
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - meanReturn, 2), 0
  ) / returns.length;
  
  return Math.sqrt(variance) * 100;
};

//=============================================================================
// TREND INDICATORS
//=============================================================================

/**
 * Calculate momentum
 * @param data Array of candle data
 * @returns Momentum as a percentage
 */
export const calculateMomentum = (data: CandleData[]) => {
  const period = data.length;
  return ((data[period - 1].close - data[0].close) / data[0].close) * 100;
};

/**
 * Calculate Ichimoku Cloud indicators
 * @param data Array of candle data
 * @returns Object containing tenkan-sen, kijun-sen, senkou span A, senkou span B, and chikou span
 */
export const calculateIchimoku = (data: CandleData[]) => {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  
  const calculateMidpoint = (period: number, slice: CandleData[]) => {
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    return (highest + lowest) / 2;
  };
  
  const tenkanSen = calculateMidpoint(tenkanPeriod, data.slice(-tenkanPeriod));
  const kijunSen = calculateMidpoint(kijunPeriod, data.slice(-kijunPeriod));
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const senkouSpanB = calculateMidpoint(senkouBPeriod, data.slice(-senkouBPeriod));
  
  return {
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan: data[data.length - 26]?.close
  };
};

//=============================================================================
// VOLUME ANALYSIS
//=============================================================================

/**
 * Analyze volume profile
 * @param data Array of candle data
 * @returns Object containing point of control and max volume
 */
export const analyzeVolumeProfile = (data: CandleData[]) => {
  const volumeByPrice = data.reduce((acc, candle) => {
    const priceLevel = Math.round(candle.close / 10) * 10;
    acc[priceLevel] = (acc[priceLevel] || 0) + candle.volume;
    return acc;
  }, {} as { [key: number]: number });
  
  const volumes = Object.values(volumeByPrice) as number[];
  const maxVolume = Math.max(...volumes);
  const maxVolumePrice = Number(
    Object.entries(volumeByPrice)
      .reduce((a, b) => Number(a[1]) > Number(b[1]) ? a : b)[0]
  );
  
  return { poc: maxVolumePrice, maxVolume };
};

//=============================================================================
// SUPPORT & RESISTANCE
//=============================================================================

/**
 * Find order blocks in the chart
 * @param data Array of candle data
 * @returns Array of order blocks with type, price levels, and time
 */
export const findOrderBlocks = (data: CandleData[]) => {
  const blocks: any[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];
    
    // Bullish Order Block
    if (current.close < current.open && // Bearish candle
        next.close > next.open && // Bullish candle
        next.close > current.high) { // Strong momentum
      blocks.push({
        type: 'bullish',
        top: current.high,
        bottom: current.low,
        time: current.time
      });
    }
    
    // Bearish Order Block
    if (current.close > current.open && // Bullish candle
        next.close < next.open && // Bearish candle
        next.close < current.low) { // Strong momentum
      blocks.push({
        type: 'bearish',
        top: current.high,
        bottom: current.low,
        time: current.time
      });
    }
  }
  
  return blocks;
};

/**
 * Find key support and resistance levels and order blocks
 * @param data Array of candle data
 * @returns Object containing support, resistance, and order blocks
 */
export const findSupportResistanceAndOrderBlocks = (data: CandleData[]) => {
  const highs = data.map(candle => candle.high);
  const lows = data.map(candle => candle.low);
  
  // Simple support and resistance based on recent highs and lows
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  
  const orderBlocks = findOrderBlocks(data);
  
  return { support, resistance, orderBlocks };
};

//=============================================================================
// MARKET ANALYSIS
//=============================================================================

/**
 * Detect divergences between price and indicators
 * @param data Array of candle data
 * @param type Type of indicator to check for divergence
 * @returns Array of divergences with type and direction
 */
export const detectDivergence = (data: CandleData[], type: 'rsi' | 'macd') => {
  const prices = data.map(c => c.close);
  const indicator = type === 'rsi' ? 
    data.map((_, i, arr) => calculateRSI(arr.slice(Math.max(0, i - 14), i + 1))) :
    data.map((_, i, arr) => {
      const slice = arr.slice(Math.max(0, i - 26), i + 1);
      const ema12 = calculateEMA(slice.slice(-12), 12);
      const ema26 = calculateEMA(slice, 26);
      return ema12 - ema26;
    });
  
  const findPivots = (arr: number[]) => {
    return arr.map((val, i, array) => {
      if (i > 0 && i < array.length - 1) {
        if (val > array[i - 1] && val > array[i + 1]) return 'high';
        if (val < array[i - 1] && val < array[i + 1]) return 'low';
      }
      return null;
    });
  };
  
  const divergences: any[] = [];
  
  // Regular Bullish Divergence
  if (prices[prices.length - 1] < prices[prices.length - 2] &&
      indicator[indicator.length - 1] > indicator[indicator.length - 2]) {
    divergences.push({ type: 'regular', direction: 'bullish' });
  }
  
  // Regular Bearish Divergence
  if (prices[prices.length - 1] > prices[prices.length - 2] &&
      indicator[indicator.length - 1] < indicator[indicator.length - 2]) {
    divergences.push({ type: 'regular', direction: 'bearish' });
  }
  
  // Hidden Divergences
  if (prices[prices.length - 1] > prices[prices.length - 2] &&
      indicator[indicator.length - 1] > indicator[indicator.length - 2]) {
    divergences.push({ type: 'hidden', direction: 'bullish' });
  }
  
  if (prices[prices.length - 1] < prices[prices.length - 2] &&
      indicator[indicator.length - 1] < indicator[indicator.length - 2]) {
    divergences.push({ type: 'hidden', direction: 'bearish' });
  }
  
  return divergences;
};

/**
 * Calculate risk level based on multiple indicators
 * @param rsi RSI value
 * @param volatility Volatility value
 * @param momentum Momentum value
 * @param atr ATR value
 * @returns Risk level as string
 */
export const calculateRiskLevel = (rsi: number, volatility: number, momentum: number, atr: number) => {
  const riskScore = (
    (rsi > 70 || rsi < 30 ? 2 : 1) +
    (volatility > 5 ? 2 : 1) +
    (Math.abs(momentum) > 10 ? 2 : 1) +
    (atr > 100 ? 2 : 1)
  ) / 4;
  
  return riskScore > 1.5 ? 'גבוה' : riskScore > 1 ? 'בינוני' : 'נמוך';
};

/**
 * Calculate Stochastic oscillator
 * @param data Array of candle data
 * @returns Object containing K and D values
 */
export const calculateStochastic = (data: CandleData[]) => {
  const period = 14;
  const kPeriod = 3;
  const dPeriod = 3;
  
  const getLowest = (slice: CandleData[]) => Math.min(...slice.map(c => c.low));
  const getHighest = (slice: CandleData[]) => Math.max(...slice.map(c => c.high));
  
  // Filter out nulls immediately to avoid type issues later
  const kValues = data.map((_, i, arr) => {
    if (i < period - 1) return null;
    
    const slice = arr.slice(i - period + 1, i + 1);
    const highest = getHighest(slice);
    const lowest = getLowest(slice);
    
    const lastClose = slice[slice.length - 1].close;
    
    if (highest === lowest) return 50; // Prevent division by zero
    return ((lastClose - lowest) / (highest - lowest)) * 100;
  }).filter((v): v is number => v !== null);
  
  // Calculate K values (the faster oscillator)
  const smoothedK: number[] = [];
  for (let i = 0; i < kValues.length - kPeriod + 1; i++) {
    const kValue = kValues.slice(i, i + kPeriod).reduce((sum, val) => sum + val, 0) / kPeriod;
    smoothedK.push(kValue);
  }
  
  // Calculate D values (the slower signal line)
  const smoothedD: number[] = [];
  for (let i = 0; i < smoothedK.length - dPeriod + 1; i++) {
    const dValue = smoothedK.slice(i, i + dPeriod).reduce((sum, val) => sum + val, 0) / dPeriod;
    smoothedD.push(dValue);
  }
  
  if (smoothedK.length === 0 || smoothedD.length === 0) {
    return { k: 50, d: 50 };
  }
  
  return {
    k: smoothedK[smoothedK.length - 1],
    d: smoothedD[smoothedD.length - 1]
  };
};

//=============================================================================
// UTILITY FUNCTIONS
//=============================================================================

/**
 * Get a comprehensive technical analysis summary
 * @param data Array of candle data
 * @returns Object containing various indicators and analysis results
 */
export const getTechnicalAnalysisSummary = (data: CandleData[]) => {
  if (!data || data.length < 200) {
    return {
      error: "Not enough data for reliable analysis"
    };
  }
  
  // Extract recent data for analysis
  const recentData = data.slice(-100);
  const shortTermData = data.slice(-14);
  
  // Calculate basic indicators
  const sma50 = calculateSMA(data.slice(-50), 50);
  const sma200 = calculateSMA(data.slice(-200), 200);
  const rsi = calculateRSI(shortTermData);
  const { k: stochK, d: stochD } = calculateStochastic(recentData);
  const bands = calculateBollingerBands(recentData);
  const momentum = calculateMomentum(shortTermData);
  const { support, resistance } = findSupportResistanceAndOrderBlocks(recentData);
  const atr = calculateATR(shortTermData);
  const volatility = calculateVolatility(shortTermData);
  const volumeProfile = analyzeVolumeProfile(recentData);
  
  // Determine trend
  const priceAboveSMA50 = data[data.length-1].close > sma50;
  const priceAboveSMA200 = data[data.length-1].close > sma200;
  const sma50AboveSMA200 = sma50 > sma200;
  
  let trend = "Neutral";
  if (priceAboveSMA50 && priceAboveSMA200 && sma50AboveSMA200) {
    trend = "Strong Bullish";
  } else if (priceAboveSMA50 && sma50AboveSMA200) {
    trend = "Bullish";
  } else if (!priceAboveSMA50 && !priceAboveSMA200 && !sma50AboveSMA200) {
    trend = "Strong Bearish";
  } else if (!priceAboveSMA50 && !sma50AboveSMA200) {
    trend = "Bearish";
  }
  
  // Overbought/Oversold conditions
  let marketCondition = "Neutral";
  if (rsi > 70 && stochK > 80 && stochD > 80) {
    marketCondition = "Strongly Overbought";
  } else if (rsi > 60 && stochK > 70) {
    marketCondition = "Overbought";
  } else if (rsi < 30 && stochK < 20 && stochD < 20) {
    marketCondition = "Strongly Oversold";
  } else if (rsi < 40 && stochK < 30) {
    marketCondition = "Oversold";
  }
  
  // Risk assessment
  const riskLevel = calculateRiskLevel(rsi, volatility, momentum, atr);
  
  // Potential signals
  const signals: any[] = [];
  
  if (rsi < 30 && trend !== "Strong Bearish") {
    signals.push("RSI Oversold - Potential Buy");
  }
  
  if (rsi > 70 && trend !== "Strong Bullish") {
    signals.push("RSI Overbought - Potential Sell");
  }
  
  if (stochK < stochD && stochK < 20 && stochD < 20) {
    signals.push("Stochastic Oversold - Watch for Bull Cross");
  }
  
  if (stochK > stochD && stochK > 80 && stochD > 80) {
    signals.push("Stochastic Overbought - Watch for Bear Cross");
  }
  
  const lastPrice = data[data.length-1].close;
  if (lastPrice < bands.lower) {
    signals.push("Price below Lower Bollinger Band - Potential Buy");
  }
  
  if (lastPrice > bands.upper) {
    signals.push("Price above Upper Bollinger Band - Potential Sell");
  }
  
  return {
    lastPrice: data[data.length-1].close,
    trend,
    marketCondition,
    riskLevel,
    indicators: {
      sma50,
      sma200,
      rsi,
      stochastic: { k: stochK, d: stochD },
      bollingerBands: bands,
      momentum,
      atr,
      volatility
    },
    levels: {
      support,
      resistance,
      volumePOC: volumeProfile.poc
    },
    signals
  };
};

export const calculateCVD = (data: CandleData[]) => {
  let cvd = 0;
  for (const candle of data) {
    cvd += candle.close > candle.open ? candle.volume : -candle.volume;
  }
  return cvd;
};

export const analyzeMarketStructure = (data: CandleData[]) => {
  const swings = data.map((candle, i, arr) => {
    if (i === 0 || i === arr.length - 1) return null;
    const prev = arr[i - 1];
    const next = arr[i + 1];
    
    if (candle.high > prev.high && candle.high > next.high) {
      return { type: 'high', price: candle.high, time: candle.time };
    }
    if (candle.low < prev.low && candle.low < next.low) {
      return { type: 'low', price: candle.low, time: candle.time };
    }
    return null;
  }).filter(Boolean);
  
  const trend = swings.length >= 2 ?
    swings[swings.length - 1]!.price > swings[swings.length - 2]!.price ? 'uptrend' : 'downtrend' :
    'neutral';
  
  return {
    swingPoints: swings,
    trend,
    strength: Math.abs(data[data.length - 1].close - data[0].close) / data[0].close * 100
  };
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data Array of candle data
 * @returns Object containing MACD line, signal line, and histogram
 */
export const calculateMACD = (data: CandleData[]) => {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([{ close: macdLine } as CandleData], 9);
  
  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine
  };
};

/**
 * Identify candlestick patterns
 * @param data Array of candle data
 * @returns Array of identified patterns
 */
export const identifyCandlestickPatterns = (data: CandleData[]): string[] => {
  const patterns: string[] = [];
  const lastCandle = data[data.length - 1];
  const prevCandle = data[data.length - 2];
  
  if (!lastCandle || !prevCandle) return patterns;
  
  // Doji
  const bodySize = Math.abs(lastCandle.close - lastCandle.open);
  const wickSize = lastCandle.high - lastCandle.low;
  if (bodySize / wickSize < 0.1) {
    patterns.push('Doji');
  }
  
  // Hammer
  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  if (lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
    patterns.push('Hammer');
  }
  
  // Engulfing
  if (lastCandle.open < prevCandle.close &&
      lastCandle.close > prevCandle.open &&
      prevCandle.close < prevCandle.open) {
    patterns.push('Bullish Engulfing');
  } else if (lastCandle.open > prevCandle.close &&
             lastCandle.close < prevCandle.open &&
             prevCandle.close > prevCandle.open) {
    patterns.push('Bearish Engulfing');
  }
  
  return patterns;
};

/**
 * Calculate Fibonacci retracement levels
 * @param high Highest price in the range
 * @param low Lowest price in the range
 * @returns Object containing Fibonacci levels
 */
export const calculateFibonacciLevels = (high: number, low: number) => {
  const diff = high - low;
  return {
    level0: low, // 0%
    level236: low + diff * 0.236, // 23.6%
    level382: low + diff * 0.382, // 38.2%
    level500: low + diff * 0.5, // 50%
    level618: low + diff * 0.618, // 61.8%
    level786: low + diff * 0.786, // 78.6%
    level1000: high // 100%
  };
};

/**
 * Calculate pivot points
 * @param high High price
 * @param low Low price
 * @param close Close price
 * @returns Object containing pivot points and support/resistance levels
 */
export const calculatePivotPoints = (high: number, low: number, close: number) => {
  const pp = (high + low + close) / 3;
  return {
    pp,
    r1: (2 * pp) - low,
    r2: pp + (high - low),
    r3: high + 2 * (pp - low),
    s1: (2 * pp) - high,
    s2: pp - (high - low),
    s3: low - 2 * (high - pp)
  };
};

/**
 * Calculate volume profile
 * @param data Array of candle data
 * @param levels Number of price levels to analyze
 * @returns Object containing volume distribution by price level
 */
export const calculateVolumeProfile = (data: CandleData[], levels = 10) => {
  const high = Math.max(...data.map(d => d.high));
  const low = Math.min(...data.map(d => d.low));
  const priceRange = high - low;
  const levelSize = priceRange / levels;
  
  const profile = new Array(levels).fill(0);
  
  data.forEach(candle => {
    const avgPrice = (candle.high + candle.low) / 2;
    const levelIndex = Math.floor((avgPrice - low) / levelSize);
    if (levelIndex >= 0 && levelIndex < levels) {
      profile[levelIndex] += candle.volume;
    }
  });
  
  return {
    profile,
    poc: low + (profile.indexOf(Math.max(...profile)) * levelSize),
    valueArea: profile.reduce((sum, vol) => sum + vol, 0) * 0.7
  };
};

export const calculateTechnicalIndicators = (data: CandleData[]) => {
  if (!data || data.length === 0) return null;

  const latestCandle = data[data.length - 1];
  const previousCandle = data[data.length - 2];
  
  // Calculate various SMAs and EMAs
  const sma20 = calculateSMA(data.slice(-20), 20);
  const sma50 = calculateSMA(data.slice(-50), 50);
  const sma200 = calculateSMA(data.slice(-200), 200);
  const ema12 = calculateEMA(data.slice(-12), 12);
  const ema26 = calculateEMA(data.slice(-26), 26);
  const ema55 = calculateEMA(data.slice(-55), 55);
  
  // Calculate MACD
  const macd = ema12 - ema26;
  const macdData = Array(9).fill(null).map((_, i) => ({
    time: data[data.length - 9 + i].time,
    open: macd,
    high: macd,
    low: macd,
    close: macd,
    volume: 0
  }));
  const signalLine = calculateEMA(macdData, 9);
  const macdHistogram = macd - signalLine;
  
  // Calculate RSI with divergence detection
  const rsi = calculateRSI(data.slice(-14));
  const rsiDivergence = detectDivergence(data.slice(-50), 'rsi');
  
  // Calculate Stochastic
  const stoch = calculateStochastic(data.slice(-14));
  
  // Calculate Bollinger Bands with standard deviation channels
  const { upper, middle, lower, stdDev } = calculateBollingerBands(data.slice(-20));
  
  // Calculate Ichimoku Cloud
  const ichimoku = calculateIchimoku(data.slice(-52));
  
  // Calculate support and resistance with order blocks
  const { support, resistance, orderBlocks } = findSupportResistanceAndOrderBlocks(data.slice(-100));
  
  // Calculate Volume Profile and CVD
  const volumeProfile = analyzeVolumeProfile(data.slice(-50));
  const cvd = calculateCVD(data.slice(-100));
  
  // Calculate momentum and volatility indicators
  const momentum = calculateMomentum(data.slice(-14));
  const volatility = calculateVolatility(data.slice(-14));
  const atr = calculateATR(data.slice(-14));
  
  // Market structure analysis
  const marketStructure = analyzeMarketStructure(data.slice(-100));
  
  // Fibonacci levels
  const fibLevels = calculateFibonacciLevels(data[data.length - 1].high, data[data.length - 1].low);
  
  return {
    price: {
      current: latestCandle.close,
      change: ((latestCandle.close - previousCandle.close) / previousCandle.close) * 100,
      volume: latestCandle.volume,
      high24h: Math.max(...data.slice(-24).map(c => c.high)),
      low24h: Math.min(...data.slice(-24).map(c => c.low))
    },
    indicators: {
      sma: { sma20, sma50, sma200 },
      ema: { ema12, ema26, ema55 },
      macd: { value: macd, signal: signalLine, histogram: macdHistogram },
      rsi: { value: rsi, divergence: rsiDivergence },
      stochastic: stoch,
      bollingerBands: { upper, middle, lower, stdDev },
      ichimoku,
      atr
    },
    structure: {
      support,
      resistance,
      orderBlocks,
      marketStructure,
      fibLevels
    },
    volume: {
      profile: volumeProfile,
      cvd,
      deltaAnalysis: analyzeDeltaVolume(data.slice(-50))
    },
    patterns: {
      candles: findCandlePatterns(data.slice(-5)),
      chart: findChartPatterns(data.slice(-100))
    },
    momentum,
    volatility,
    risk: calculateRiskLevel(rsi, volatility, momentum, atr)
  }; 
}

/**
 * Analyze delta volume to understand buying/selling pressure
 * @param data Array of candle data
 * @returns Array of delta volume analysis
 */
export const analyzeDeltaVolume = (data: CandleData[]) => {
  const deltaVolume = data.map(candle => {
    const delta = candle.close > candle.open ? candle.volume : -candle.volume;
    return {
      time: candle.time,
      delta,
      cumulative: 0
    };
  });
  
  let cumulative = 0;
  for (const dv of deltaVolume) {
    cumulative += dv.delta;
    dv.cumulative = cumulative;
  }
  
  return deltaVolume;
};

/**
 * Find chart patterns like Head and Shoulders, Double Top/Bottom
 * @param data Array of candle data
 * @returns Array of identified chart patterns
 */
export const findChartPatterns = (data: CandleData[]): string[] => {
  const patterns: string[] = [];
  const highs = data.map(c => c.high);
  const lows = data.map(c => c.low);
  
  // Head and Shoulders
  for (let i = 0; i < highs.length - 5; i++) {
    const leftShoulder = highs[i];
    const head = highs[i + 2];
    const rightShoulder = highs[i + 4];
    
    if (head > leftShoulder &&
        head > rightShoulder &&
        Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.02) {
      patterns.push('Head and Shoulders');
      break;
    }
  }
  
  // Double Top
  for (let i = 0; i < highs.length - 3; i++) {
    const first = highs[i];
    const second = highs[i + 2];
    
    if (Math.abs(first - second) / first < 0.02 &&
        highs[i + 1] < Math.min(first, second)) {
      patterns.push('Double Top');
      break;
    }
  }
  
  // Double Bottom
  for (let i = 0; i < lows.length - 3; i++) {
    const first = lows[i];
    const second = lows[i + 2];
    
    if (Math.abs(first - second) / first < 0.02 &&
        lows[i + 1] > Math.max(first, second)) {
      patterns.push('Double Bottom');
      break;
    }
  }
  
  return patterns;
};

/**
 * Find candlestick patterns in recent data
 * @param data Array of candle data
 * @returns Array of identified candlestick patterns
 */
export const findCandlePatterns = (data: CandleData[]): string[] => {
  const patterns: string[] = [];
  const [c1, _c2, _c3, c4, c5] = data.slice(-5);
  
  if (!c5 || !c4) return patterns;
  
  // Doji
  if (Math.abs(c5.open - c5.close) / (c5.high - c5.low) < 0.1) {
    patterns.push('Doji');
  }
  
  // Hammer
  if (c5.close > c5.open &&
      (c5.high - c5.close) < (c5.close - c5.low) * 0.5 &&
      (c5.close - c5.open) < (c5.close - c5.low) * 0.3) {
    patterns.push('Hammer');
  }
  
  // Shooting Star
  if (c5.close < c5.open &&
      (c5.high - c5.open) > (c5.open - c5.low) * 2 &&
      (c5.open - c5.close) < (c5.high - c5.open) * 0.3) {
    patterns.push('Shooting Star');
  }
  
  // Engulfing
  if (c4.close < c4.open && // Previous bearish
      c5.close > c5.open && // Current bullish
      c5.open < c4.close && // Opens below previous close
      c5.close > c4.open) { // Closes above previous open
    patterns.push('Bullish Engulfing');
  }
  if (c4.close > c4.open && // Previous bullish
      c5.close < c5.open && // Current bearish
      c5.open > c4.close && // Opens above previous close
      c5.close < c4.open) { // Closes below previous open
    patterns.push('Bearish Engulfing');
  }
  
  return patterns;
}; 