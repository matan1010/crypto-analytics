'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  IChartApi,
  ISeriesApi,
  SeriesType,
  Time,
  LineData,
  CandlestickData as TradingViewCandlestickData,
} from 'lightweight-charts';
import { CandleData } from '@/types/crypto';

// Professional dark theme colors (Binance style)
const backgroundColor = '#0B0E11' as const;
const textColor = '#B7BDC6' as const;
const gridColor = '#1C2127' as const;
const candleUpColor = '#0ECB81' as const;
const candleDownColor = '#F6465D' as const;
const crosshairColor = '#758696' as const;
const toolbarBgColor = 'rgba(11, 14, 17, 0.7)' as const;

interface CryptoChartProps {
  data: CandleData[];
  symbol: string;
  timeframe: string;
}

interface DrawingLine {
  series: ISeriesApi<SeriesType>;
  points: { time: number; value: number }[];
}

const CryptoChart: React.FC<CryptoChartProps> = ({ data, symbol, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('cursor');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{price: number, time: Time}[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<{ [key: string]: boolean }>({
    sma20: true,
    sma50: true,
    sma200: true,
  });
  const indicatorSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> }>({});
  const drawingLinesRef = useRef<DrawingLine[]>([]);
  const [legendData, setLegendData] = useState<{
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
  }>({
    open: null,
    high: null,
    low: null,
    close: null
  });
  const lastUpdateTimeRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const tools = [
    { id: 'cursor', icon: '🖱️', label: 'Cursor' },
    { id: 'line', icon: '📏', label: 'Trend Line' },
    { id: 'horizontal', icon: '⚡', label: 'Horizontal Line' },
    { id: 'fibonacci', icon: '🌀', label: 'Fibonacci' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'text', icon: '📝', label: 'Text' },
    { id: 'brush', icon: '🖌️', label: 'Brush' },
    { id: 'arrow', icon: '➡️', label: 'Arrow' },
  ];

  const handleToolClick = (toolId: string) => {
    setSelectedTool(toolId);
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleChartClick = (e: MouseEvent) => {
    if (!chartRef.current || !candlestickSeriesRef.current || selectedTool === 'cursor') return;

    const timeScale = chartRef.current.timeScale();
    if (!timeScale) return;

    const x = e.offsetX;
    const y = e.offsetY;

    const time = timeScale.coordinateToTime(x);
    const price = candlestickSeriesRef.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    if (isDrawing) {
      const points = [...drawingPoints, { price, time }];
      drawShape(points);
      setIsDrawing(false);
      setDrawingPoints([]);
    } else {
      setIsDrawing(true);
      setDrawingPoints([{ price, time }]);
    }
  };

  const drawShape = (points: any[]) => {
    if (!chartRef.current || points.length < 2) return;

    const newLine: DrawingLine = {
      series: chartRef.current.addLineSeries({
        color: textColor,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
      }),
      points: points.map(p => ({ time: p.time, value: p.price }))
    };

    switch (selectedTool) {
      case 'line':
        newLine.series.setData([
          { time: points[0].time, value: points[0].price },
          { time: points[1].time, value: points[1].price },
        ]);
        drawingLinesRef.current.push(newLine);
        break;

      case 'horizontal':
        const chart = chartRef.current as any;
        chart.addPriceLine({
          price: points[0].price,
          color: textColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Support/Resistance',
        });
        break;

      case 'fibonacci':
        const [startPrice, endPrice] = points[0].price > points[1].price ? 
          [points[0].price, points[1].price] : 
          [points[1].price, points[0].price];
        const priceDiff = Math.abs(startPrice - endPrice);
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const fibChart = chartRef.current as any;
        
        levels.forEach(level => {
          const price = startPrice - (priceDiff * level);
          const opacity = Math.floor((0.3 + level * 0.3) * 255).toString(16).padStart(2, '0');
          fibChart.addPriceLine({
            price,
            color: `#B7BDC6${opacity}`,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Fib ${(level * 100).toFixed(1)}%`,
          });
        });
        break;

      case 'rectangle':
        const [x1, x2] = [points[0].time, points[1].time].sort();
        const [y1, y2] = [points[0].price, points[1].price].sort();
        
        newLine.series.setData([
          { time: x1, value: y1 },
          { time: x1, value: y2 },
          { time: x2, value: y2 },
          { time: x2, value: y1 },
          { time: x1, value: y1 },
        ]);
        drawingLinesRef.current.push(newLine);
        break;

      case 'arrow':
        const dx = points[1].time - points[0].time;
        const dy = points[1].price - points[0].price;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(Number(dx) * Number(dx) + dy * dy) * 0.2;
        
        const arrowHead1 = {
          time: points[1].time - Math.cos(angle + Math.PI/6) * length,
          value: points[1].price - Math.sin(angle + Math.PI/6) * length
        };
        
        const arrowHead2 = {
          time: points[1].time - Math.cos(angle - Math.PI/6) * length,
          value: points[1].price - Math.sin(angle - Math.PI/6) * length
        };
        
        newLine.series.setData([
          { time: points[0].time, value: points[0].price },
          { time: points[1].time, value: points[1].price },
          arrowHead1,
          { time: points[1].time, value: points[1].price },
          arrowHead2
        ]);
        drawingLinesRef.current.push(newLine);
        break;
    }
  };

  const toggleIndicator = (indicatorId: string) => {
    setActiveIndicators(prev => {
      const newState = { ...prev, [indicatorId]: !prev[indicatorId] };
      
      // Update indicator visibility
      if (indicatorSeriesRef.current[indicatorId]) {
        indicatorSeriesRef.current[indicatorId].applyOptions({
          visible: newState[indicatorId]
        });
      }
      
      return newState;
    });
  };

  // Function to calculate SMA
  const calculateSMA = (data: CandleData[], period: number) => {
    const result: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((total, candle) => total + candle.close, 0);
      const sma = sum / period;
      
      // Handle time conversion
      let timeValue: any = data[i].time;
      if (typeof timeValue === 'number' && timeValue > 10000000000) {
        timeValue = Math.floor(timeValue / 1000);
      }
      
      result.push({
        time: timeValue,
        value: sma
      });
    }
    return result;
  };

  // Function to add SMA indicator
  const addSMAIndicator = (period: number, color: string) => {
    if (!chartRef.current) return;
    
    const id = `sma${period}`;
    const series = chartRef.current.addLineSeries({
      color: color,
      lineWidth: 1,
      title: `SMA ${period}`,
    });
    
    indicatorSeriesRef.current[id] = series;
    
    if (data.length >= period) {
      const smaData = calculateSMA(data, period);
      series.setData(smaData);
    }
  };

  // Function to update SMA indicator
  const updateSMAIndicator = (period: number) => {
    if (!chartRef.current) return;
    
    const id = `sma${period}`;
    const series = indicatorSeriesRef.current[id];
    
    if (series && data.length >= period) {
      const smaData = calculateSMA(data, period);
      series.setData(smaData);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    const timeScale = chartRef.current.timeScale();
    if (!timeScale) return;

    const x = e.offsetX;
    const y = e.offsetY;

    const time = timeScale.coordinateToTime(x);
    const price = candlestickSeriesRef.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    const coordinate = {
      time: time as Time,
      price: price
    };

    const candleData = data.find((d: CandleData) => d.time === coordinate.time);
    if (!candleData) return;

    setLegendData({
      open: candleData.open,
      high: candleData.high,
      low: candleData.low,
      close: candleData.close
    });
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup previous chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      indicatorSeriesRef.current = {};
      drawingLinesRef.current = [];
    }

    const container = chartContainerRef.current;
    const { width, height } = container.getBoundingClientRect();

    // Create chart with dark theme
    chartRef.current = createChart(container, {
      layout: {
        background: { color: '#0B0E11', type: ColorType.Solid },
        textColor: '#B7BDC6',
        fontSize: 12,
        fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: '#1C2127', style: LineStyle.SparseDotted },
        horzLines: { color: '#1C2127', style: LineStyle.SparseDotted },
      },
      width,
      height: 500,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0B0E11',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0B0E11',
        },
      },
      rightPriceScale: {
        borderColor: '#1C2127',
        scaleMargins: { top: 0.1, bottom: 0.2 },
        mode: PriceScaleMode.Normal,
        borderVisible: true,
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: '#1C2127',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 6,
        minBarSpacing: 4,
      },
      watermark: {
        color: 'rgba(183, 189, 198, 0.1)',
        visible: true,
        text: symbol.replace('USDT', '/USDT'),
        fontSize: 72,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontStyle: 'normal',
      },
    });

    // Add candlestick series with Binance-style colors
    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#0ECB81', // Binance green
      downColor: '#F6465D', // Binance red
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      priceFormat: {
        type: 'price',
        precision: symbol.includes('USDT') ? 2 : 8,
        minMove: symbol.includes('USDT') ? 0.01 : 0.00000001,
      },
    });

    // Add volume series
    const volumeSeries = chartRef.current.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add event listeners
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleChartClick);

    // Add SMA indicators if enabled
    if (activeIndicators.sma20) {
      addSMAIndicator(20, '#1E88E5'); // Blue
    }
    if (activeIndicators.sma50) {
      addSMAIndicator(50, '#FF9800'); // Orange
    }
    if (activeIndicators.sma200) {
      addSMAIndicator(200, '#9C27B0'); // Purple
    }

    // Set up resize observer
    const handleResize = () => {
      if (chartRef.current && container) {
        const { width } = container.getBoundingClientRect();
        chartRef.current.applyOptions({ width });
        chartRef.current.timeScale().fitContent();
      }
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(container);

    // Set initial data
    if (data.length > 0) {
      updateChartData(volumeSeries);
    }

    setIsInitialized(true);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleChartClick);
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Function to update chart data
  const updateChartData = (volumeSeries?: ISeriesApi<'Histogram'>) => {
    if (!chartRef.current || !candlestickSeriesRef.current || data.length === 0) return;
    
    const candleData = data.map(candle => {
      // Handle time conversion
      let timeValue: any = candle.time;
      if (typeof timeValue === 'number' && timeValue > 10000000000) {
        timeValue = Math.floor(timeValue / 1000);
      }
      
      return {
        time: timeValue,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      };
    });

    candlestickSeriesRef.current.setData(candleData as TradingViewCandlestickData[]);
    
    // Update volume data if available
    if (volumeSeries) {
      const volumeData = data.map(candle => {
        // Handle time conversion
        let timeValue: any = candle.time;
        if (typeof timeValue === 'number' && timeValue > 10000000000) {
          timeValue = Math.floor(timeValue / 1000);
        }
        
        return {
          time: timeValue,
          value: candle.volume,
          color: candle.close >= candle.open ? '#0ECB81' : '#F6465D', // Match candle colors
        };
      });
      
      volumeSeries.setData(volumeData as LineData[]);
    }
    
    // Update SMA indicators
    if (activeIndicators.sma20) {
      updateSMAIndicator(20);
    }
    if (activeIndicators.sma50) {
      updateSMAIndicator(50);
    }
    if (activeIndicators.sma200) {
      updateSMAIndicator(200);
    }
    
    // Fit content and adjust visible range
    const timeScale = chartRef.current.timeScale();
    timeScale.fitContent();
    
    // Optionally, set visible range to show last N candles
    if (candleData.length > 50) {
      const fromTime: any = candleData[candleData.length - 50].time;
      const toTime: any = candleData[candleData.length - 1].time;
      
      timeScale.setVisibleRange({
        from: fromTime,
        to: toTime
      });
    }
  };

  // Update chart data when data changes
  useEffect(() => {
    if (isInitialized && data.length > 0) {
      // Limit updates to prevent UI jumps
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 5000) return;
      lastUpdateTimeRef.current = now;
      
      updateChartData();
    }
  }, [data, isInitialized]);

  // Create legend
  useEffect(() => {
    if (legendRef.current) {
      const legend = document.createElement('div');
      legend.style.position = 'absolute';
      legend.style.left = '12px';
      legend.style.top = '12px';
      legend.style.zIndex = '2';
      legend.style.userSelect = 'none';
      legend.style.fontSize = '14px';
      legend.style.fontFamily = "'IBM Plex Sans', sans-serif";
      legend.style.lineHeight = '1.4';
      legend.style.color = textColor;
      legend.style.padding = '8px 12px';
      legend.style.background = 'rgba(11, 14, 17, 0.7)';
      legend.style.borderRadius = '4px';
      legend.style.backdropFilter = 'blur(8px)';
      legend.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
      legend.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      legendRef.current.appendChild(legend);

      const updateLegend = (param: {time?: Time} | null) => {
        if (!legendRef.current || !chartRef.current || !candlestickSeriesRef.current) return;
        
        const candleData = param?.time ? 
          data.find((d: CandleData) => d.time === param.time) : 
          data[data.length - 1];
          
        if (!candleData) return;

        const changePercent = ((candleData.close - candleData.open) / candleData.open * 100).toFixed(2);
        const color = candleData.close >= candleData.open ? candleUpColor : candleDownColor;
        const change = parseFloat(changePercent) >= 0 ? `+${changePercent}%` : `${changePercent}%`;
        const volume = candleData.volume.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

        const date = new Date(Number(typeof candleData.time === 'number' ? candleData.time * 1000 : Date.now()));
        const formattedDate = date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        legend.innerHTML = `
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>${symbol.replace('USDT', '/USDT')}</span>
            <span style="color: ${color}; font-size: 14px;">${change}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; font-size: 13px;">
            <div>O: <span style="color: ${textColor}">${candleData.open.toFixed(2)}</span></div>
            <div>H: <span style="color: ${textColor}">${candleData.high.toFixed(2)}</span></div>
            <div>L: <span style="color: ${textColor}">${candleData.low.toFixed(2)}</span></div>
            <div>C: <span style="color: ${textColor}">${candleData.close.toFixed(2)}</span></div>
          </div>
          <div style="margin-top: 4px; font-size: 13px;">
            <div>Vol: <span style="color: ${textColor}">${volume}</span></div>
            <div style="color: ${textColor}">${formattedDate}</div>
          </div>
        `;
      };

      if (chartRef.current) {
        chartRef.current.subscribeCrosshairMove(updateLegend);
      }
      updateLegend(null);
    }
  }, [symbol, data]);

  // Create toolbar
  useEffect(() => {
    if (toolbarRef.current) {
      // נקה את התוכן הקיים
      toolbarRef.current.innerHTML = '';
      
      const toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.style.padding = '8px';
      toolbar.style.background = 'rgba(11, 14, 17, 0.7)';
      toolbar.style.borderRadius = '4px';
      toolbar.style.backdropFilter = 'blur(8px)';
      toolbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
      toolbar.style.border = '1px solid rgba(255, 255, 255, 0.1)';

      // Add indicator toggles
      const createIndicatorToggle = (id: string, label: string, isActive: boolean) => {
        const toggle = document.createElement('div');
        toggle.style.display = 'flex';
        toggle.style.alignItems = 'center';
        toggle.style.gap = '4px';
        toggle.style.cursor = 'pointer';
        toggle.style.padding = '4px 8px';
        toggle.style.borderRadius = '4px';
        toggle.style.backgroundColor = isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
        toggle.style.color = isActive ? textColor : 'rgba(183, 189, 198, 0.5)';
        toggle.style.fontSize = '12px';
        toggle.style.transition = 'all 0.2s ease';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isActive;
        checkbox.style.margin = '0';
        
        const span = document.createElement('span');
        span.textContent = label;
        
        toggle.appendChild(checkbox);
        toggle.appendChild(span);
        
        toggle.addEventListener('click', () => {
          const newState = !activeIndicators[id];
          setActiveIndicators(prev => ({ ...prev, [id]: newState }));
          
          if (newState) {
            if (id === 'sma20') addSMAIndicator(20, '#1E88E5');
            if (id === 'sma50') addSMAIndicator(50, '#FF9800');
            if (id === 'sma200') addSMAIndicator(200, '#9C27B0');
          } else {
            if (chartRef.current && indicatorSeriesRef.current[id]) {
              chartRef.current.removeSeries(indicatorSeriesRef.current[id]);
              delete indicatorSeriesRef.current[id];
            }
          }
          
          // עדכון הממשק
          checkbox.checked = newState;
          toggle.style.backgroundColor = newState ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
          toggle.style.color = newState ? textColor : 'rgba(183, 189, 198, 0.5)';
        });
        
        return toggle;
      };
      
      toolbar.appendChild(createIndicatorToggle('sma20', 'SMA 20', activeIndicators.sma20));
      toolbar.appendChild(createIndicatorToggle('sma50', 'SMA 50', activeIndicators.sma50));
      toolbar.appendChild(createIndicatorToggle('sma200', 'SMA 200', activeIndicators.sma200));
      
      toolbarRef.current.appendChild(toolbar);
    }
  }, [activeIndicators, chartRef.current]);

  return (
    <div className="relative w-full bg-gray-900 rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{symbol} - {timeframe}</h2>
      </div>
      <div className="w-full h-[500px]">
        <div ref={chartContainerRef} className="w-full h-full" />
        <div ref={legendRef} className="absolute top-4 left-4 z-10" />
        <div ref={toolbarRef} className="absolute top-4 right-4 z-10" />
      </div>
    </div>
  );
};

export default CryptoChart; 