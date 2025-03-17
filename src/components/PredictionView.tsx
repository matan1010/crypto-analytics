import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { CandleData } from '@/types/crypto';
import { Time } from 'lightweight-charts';

// Define our own AdvancedAnalysis interface since we couldn't find the original
interface AdvancedAnalysis {
  supportLevels: number[];
  resistanceLevels: number[];
  trendStrength: number;
  volatilityIndex: number;
  marketSentiment: string;
  keyFactors: string[];
}

interface PredictionViewProps {
  chartData: CandleData[];
}

export const PredictionView: React.FC<PredictionViewProps> = ({ chartData }) => {
  const [analysis, setAnalysis] = useState<AdvancedAnalysis | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<string>('Neutral');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  
  // Refs to maintain state between renders
  const dataRef = useRef<CandleData[]>([]);
  const predictionsRef = useRef<any[]>([]);
  const viewStateRef = useRef({
    startIndex: 0,
    endIndex: 0,
    isAtLatest: true
  });
  const lastUpdateTimeRef = useRef<number>(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Function to update predictions (moved before useEffect and wrapped with useCallback)
  const updatePredictions = useCallback(async (data: CandleData[]) => {
    if (!data || data.length < 30) return;
    
    // Use the last 30 candles for prediction
    const recentData = data.slice(-30);
    
    // Simple prediction model (in a real app, this would be more sophisticated)
    const closePrices = recentData.map(d => d.close);
    const lastPrice = closePrices[closePrices.length - 1];
    
    // Generate some future predictions (simplified)
    const futurePredictions: Array<{time: any, price: number, upperBound: number, lowerBound: number, isPredict: boolean}> = [];
    const lastTimeValue = recentData[recentData.length - 1].time;
    const prevTimeValue = recentData[recentData.length - 2].time;
    
    // Calculate time interval based on the type of time
    let timeInterval = 3600; // Default to 1 hour in seconds
    
    if (typeof lastTimeValue === 'number' && typeof prevTimeValue === 'number') {
      timeInterval = lastTimeValue - prevTimeValue;
    }
    
    // Generate 10 future predictions
    for (let i = 1; i <= 10; i++) {
      // Simple prediction model (random walk with trend)
      const randomFactor = 0.005; // 0.5% random movement
      const trendFactor = 0.001; // 0.1% trend
      const change = lastPrice * (randomFactor * (Math.random() * 2 - 1) + trendFactor);
      const predictedPrice = lastPrice + change * i;
      
      // Add confidence intervals
      const volatility = 0.01 * i; // Increasing uncertainty with time
      const upperBound = predictedPrice * (1 + volatility);
      const lowerBound = predictedPrice * (1 - volatility);
      
      // Create a new time value based on the type of the last time
      let newTime;
      if (typeof lastTimeValue === 'number') {
        newTime = lastTimeValue + timeInterval * i;
      } else {
        // For other time types, we'll just use the last time
        newTime = lastTimeValue;
      }
      
      futurePredictions.push({
        time: newTime,
        price: predictedPrice,
        upperBound,
        lowerBound,
        isPredict: true
      });
    }
    
    // Combine historical data with predictions for display
    const combinedData = [
      ...recentData.map(d => ({
        time: d.time,
        price: d.close,
        upperBound: d.close,
        lowerBound: d.close,
        isPredict: false
      })),
      ...futurePredictions
    ];
    
    // Update predictions state
    setPredictions(combinedData);
    predictionsRef.current = combinedData;
    
    // Update confidence level (random for demo)
    setConfidenceLevel(Math.round(65 + Math.random() * 20));
    
    // Update sentiment based on prediction trend
    const lastPredictions = futurePredictions.slice(-3);
    const firstPrediction = futurePredictions[0].price;
    const lastPrediction = lastPredictions[lastPredictions.length - 1].price;
    
    if (lastPrediction > firstPrediction * 1.01) {
      setSentiment('Bullish');
    } else if (lastPrediction < firstPrediction * 0.99) {
      setSentiment('Bearish');
    } else {
      setSentiment('Neutral');
    }
  }, []);

  // Initialize analysis
  useEffect(() => {
    const initializeAnalysis = async () => {
      setIsLoading(true);
      
      // Simulate loading advanced analysis
      setTimeout(() => {
        if (chartData && chartData.length > 0) {
          setAnalysis({
            supportLevels: [chartData[chartData.length - 1].close * 0.95, chartData[chartData.length - 1].close * 0.9],
            resistanceLevels: [chartData[chartData.length - 1].close * 1.05, chartData[chartData.length - 1].close * 1.1],
            trendStrength: 0.75,
            volatilityIndex: 0.45,
            marketSentiment: 'Bullish',
            keyFactors: [
              'Increased trading volume',
              'Positive market news',
              'Strong technical indicators'
            ]
          });
        }
        setIsLoading(false);
      }, 1000);
    };

    if (chartData && chartData.length > 0) {
      initializeAnalysis();
      dataRef.current = [...chartData];
      updatePredictions(chartData);
    }
  }, [chartData, updatePredictions]);

  // Update predictions when chart data changes
  useEffect(() => {
    if (!chartData || chartData.length === 0 || !dataRef.current.length) return;
    
    // Don't update too frequently (minimum 10 seconds between updates)
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 10000) return;
    lastUpdateTimeRef.current = now;
    
    // Check if we have new data
    const lastExistingTime = dataRef.current[dataRef.current.length - 1]?.time;
    const newData = chartData.filter(candle => {
      // Handle different time types
      if (typeof candle.time === 'number' && typeof lastExistingTime === 'number') {
        return candle.time > lastExistingTime;
      }
      // For other time types, we'll just use the new data
      return true;
    });
    
    // Only update predictions if there's enough new data
    if (newData.length < 3) return;
    
    // Save current view state before updating
    if (chartContainerRef.current) {
      const container = chartContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      
      // Calculate if user is viewing the latest data
      viewStateRef.current.isAtLatest = (scrollLeft + clientWidth >= scrollWidth - 20);
    }
    
    // Update data reference with new data
    dataRef.current = [...chartData];
    
    // Update predictions with the new data
    updatePredictions(dataRef.current);
  }, [chartData, updatePredictions]);

  // Function to format time for display
  const formatTime = (timestamp: any) => {
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  };

  // Function to handle chart scroll
  const handleChartScroll = () => {
    if (!chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Update view state
    viewStateRef.current.isAtLatest = (scrollLeft + clientWidth >= scrollWidth - 20);
  };

  // Restore scroll position after render if needed
  useEffect(() => {
    if (!chartContainerRef.current || viewStateRef.current.isAtLatest) return;
    
    // If user wasn't at the latest data, maintain their scroll position
    const container = chartContainerRef.current;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    if (!viewStateRef.current.isAtLatest) {
      // Scroll to maintain relative position
      container.scrollLeft = scrollWidth - clientWidth - 20;
    }
  }, [predictions]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
          <p className="text-gray-300 text-sm">{formatTime(label)}</p>
          <p className="text-white font-medium">${Number(payload[0].value).toFixed(2)}</p>
          {data.isPredict && (
            <>
              <p className="text-gray-400 text-xs mt-1">טווח אפשרי:</p>
              <p className="text-green-400 text-xs">${Number(data.upperBound).toFixed(2)}</p>
              <p className="text-red-400 text-xs">${Number(data.lowerBound).toFixed(2)}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">תחזיות מתקדמות</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">מחיר חזוי (24 שעות)</div>
              <div className="text-2xl font-semibold">
                ${predictions.length > 0 ? 
                  predictions[predictions.length - 1].price.toFixed(2) : 
                  '0.00'
                }
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">רמת ביטחון</div>
              <div className="text-2xl font-semibold">{confidenceLevel}%</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">סנטימנט שוק</div>
              <div className={`text-2xl font-semibold ${
                sentiment === 'Bullish' ? 'text-green-500' : 
                sentiment === 'Bearish' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {sentiment === 'Bullish' ? 'חיובי' : 
                 sentiment === 'Bearish' ? 'שלילי' : 'ניטרלי'}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">תנודתיות</div>
              <div className="text-2xl font-semibold">
                {analysis ? `${(analysis.volatilityIndex * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
          
          <div 
            className="h-80 w-full overflow-x-auto" 
            ref={chartContainerRef}
            onScroll={handleChartScroll}
          >
            <div className="h-full w-full min-w-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictions} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatTime} 
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    formatter={(value) => {
                      if (value === 'price') return 'מחיר';
                      if (value === 'upperBound') return 'גבול עליון';
                      if (value === 'lowerBound') return 'גבול תחתון';
                      return value;
                    }}
                  />
                  
                  {/* Area for prediction range */}
                  <defs>
                    <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  
                  {/* Upper and lower bounds for predictions */}
                  <Line 
                    type="monotone" 
                    dataKey="upperBound" 
                    stroke="#10B981" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="lowerBound" 
                    stroke="#EF4444" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  
                  {/* Main price line */}
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (!payload.isPredict) {
                        return <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill="#3B82F6" />;
                      }
                      return <React.Fragment key={`empty-dot-${index}`}></React.Fragment>;
                    }}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                  
                  {/* Support and resistance levels */}
                  {analysis && analysis.supportLevels.map((level, i) => (
                    <ReferenceLine 
                      key={`support-${i}`} 
                      y={level} 
                      stroke="#10B981" 
                      strokeDasharray="3 3"
                      label={{ value: `תמיכה $${level.toFixed(2)}`, fill: '#10B981', fontSize: 10, position: 'insideBottomRight' }}
                    />
                  ))}
                  {analysis && analysis.resistanceLevels.map((level, i) => (
                    <ReferenceLine 
                      key={`resistance-${i}`} 
                      y={level} 
                      stroke="#EF4444" 
                      strokeDasharray="3 3"
                      label={{ value: `התנגדות $${level.toFixed(2)}`, fill: '#EF4444', fontSize: 10, position: 'insideTopRight' }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {analysis && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-3">גורמי מפתח</div>
              <ul className="space-y-2">
                {analysis.keyFactors.map((factor, index) => (
                  <li key={index} className="text-sm flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 