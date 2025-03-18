import { Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResult {
  trend: string;
  strength: number;
  rsi: number;
  volatility: number;
  support: number;
  resistance: number;
  patterns: string[];
  sentiment: string;
} 