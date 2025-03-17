import * as tf from '@tensorflow/tfjs';
import { CandleData } from '../types/crypto';

export interface PredictionResult {
  predictedPrice: number;
  confidence: number;
  expectedMove: number;
}

export interface SentimentResult {
  overall: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export interface KeyLevels {
  support: number[];
  resistance: number[];
}

export class AdvancedAnalysis {
  private model: tf.LayersModel | null = null;
  private isInitialized: boolean = false;
  
  // Properties to store last analysis results
  public lastSentiment: string = 'neutral';
  public lastConfidence: number = 0;
  public lastSupportLevels: number[] = [];
  public lastResistanceLevels: number[] = [];

  /**
   * Initialize the analysis model
   */
  public async initialize(): Promise<void> {
    try {
      // In a real implementation, we would load a pre-trained model
      // For now, we'll create a simple model for demonstration
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 10, inputShape: [5], activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'tanh' }));
      
      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });
      
      this.model = model;
      this.isInitialized = true;
      console.log('Advanced analysis model initialized');
    } catch (error) {
      console.error('Failed to initialize model:', error);
      // Fallback to a simpler implementation
      this.isInitialized = true;
    }
  }

  /**
   * Predict the next price move based on recent candle data
   */
  public async predictNextMove(candles: CandleData[]): Promise<{ expectedMove: number; confidence: number }> {
    if (!this.isInitialized || candles.length < 10) {
      return { expectedMove: 0, confidence: 0 };
    }
    
    try {
      // Get the most recent candles for analysis
      const recentCandles = candles.slice(-30);
      
      // In a real implementation, we would use the model to predict
      // For now, we'll use a simple algorithm based on recent price action
      
      // Calculate price momentum
      const prices = recentCandles.map(c => c.close);
      const priceChanges = [];
      
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push((prices[i] - prices[i-1]) / prices[i-1]);
      }
      
      // Calculate average price change
      const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
      
      // Calculate volatility
      const volatility = Math.sqrt(
        priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length
      );
      
      // Calculate expected move
      const expectedMove = avgChange * (1 + (Math.random() * 0.2 - 0.1)); // Add some randomness
      
      // Calculate confidence based on volatility
      const confidence = Math.max(0, Math.min(1, 1 - volatility * 10));
      
      // Store the confidence for later use
      this.lastConfidence = confidence;
      
      return { expectedMove, confidence };
    } catch (error) {
      console.error('Error predicting next move:', error);
      return { expectedMove: 0, confidence: 0 };
    }
  }

  /**
   * Analyze market sentiment based on price and volume
   */
  public async analyzeSentiment(candles: CandleData[]): Promise<{ overall: string; volume: string; price: string }> {
    if (!this.isInitialized || candles.length < 10) {
      return { overall: 'neutral', volume: 'neutral', price: 'neutral' };
    }
    
    try {
      // Get the most recent candles for analysis
      const recentCandles = candles.slice(-20);
      
      // Calculate price trend
      const prices = recentCandles.map(c => c.close);
      const priceStart = prices[0];
      const priceEnd = prices[prices.length - 1];
      const priceChange = (priceEnd - priceStart) / priceStart;
      
      // Calculate volume trend
      const volumes = recentCandles.map(c => c.volume);
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
      const volumeChange = (recentVolume - avgVolume) / avgVolume;
      
      // Determine price sentiment
      let priceSentiment = 'neutral';
      if (priceChange > 0.02) priceSentiment = 'bullish';
      else if (priceChange < -0.02) priceSentiment = 'bearish';
      
      // Determine volume sentiment
      let volumeSentiment = 'neutral';
      if (volumeChange > 0.1) volumeSentiment = 'bullish';
      else if (volumeChange < -0.1) volumeSentiment = 'bearish';
      
      // Determine overall sentiment
      let overallSentiment = 'neutral';
      
      if (priceSentiment === 'bullish' && volumeSentiment !== 'bearish') {
        overallSentiment = 'bullish';
      } else if (priceSentiment === 'bearish' && volumeSentiment !== 'bullish') {
        overallSentiment = 'bearish';
      } else if (priceSentiment === 'neutral' && volumeSentiment !== 'neutral') {
        overallSentiment = volumeSentiment;
      }
      
      // Store the sentiment for later use
      this.lastSentiment = overallSentiment;
      
      return {
        overall: overallSentiment,
        price: priceSentiment,
        volume: volumeSentiment
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { overall: 'neutral', volume: 'neutral', price: 'neutral' };
    }
  }

  /**
   * Find key support and resistance levels
   */
  public async findKeyLevels(candles: CandleData[]): Promise<{ support: number[]; resistance: number[] }> {
    if (!this.isInitialized || candles.length < 20) {
      return { support: [], resistance: [] };
    }
    
    try {
      // Get a larger sample for finding key levels
      const sampleCandles = candles.slice(-100);
      
      // Extract highs and lows
      const highs = sampleCandles.map(c => c.high);
      const lows = sampleCandles.map(c => c.low);
      
      // Find clusters of highs and lows
      const highClusters = this.findPriceClusters(highs);
      const lowClusters = this.findPriceClusters(lows);
      
      // Get the current price
      const currentPrice = candles[candles.length - 1].close;
      
      // Filter support and resistance levels
      const supportLevels = lowClusters
        .filter(level => level < currentPrice)
        .sort((a, b) => b - a) // Sort descending
        .slice(0, 3); // Take top 3
      
      const resistanceLevels = highClusters
        .filter(level => level > currentPrice)
        .sort((a, b) => a - b) // Sort ascending
        .slice(0, 3); // Take top 3
      
      // Store the levels for later use
      this.lastSupportLevels = supportLevels;
      this.lastResistanceLevels = resistanceLevels;
      
      return { support: supportLevels, resistance: resistanceLevels };
    } catch (error) {
      console.error('Error finding key levels:', error);
      return { support: [], resistance: [] };
    }
  }

  /**
   * Helper method to find price clusters
   */
  private findPriceClusters(prices: number[]): number[] {
    // Simple implementation to find price clusters
    const clusters: { [key: string]: number } = {};
    const tolerance = 0.005; // 0.5% tolerance
    
    prices.forEach(price => {
      // Find if price belongs to an existing cluster
      let foundCluster = false;
      
      Object.keys(clusters).forEach(clusterKey => {
        const clusterPrice = parseFloat(clusterKey);
        if (Math.abs(price - clusterPrice) / clusterPrice < tolerance) {
          clusters[clusterKey]++;
          foundCluster = true;
        }
      });
      
      // If no cluster found, create a new one
      if (!foundCluster) {
        clusters[price.toString()] = 1;
      }
    });
    
    // Filter significant clusters (more than 3 occurrences)
    return Object.entries(clusters)
      .filter(([_, count]) => count > 3)
      .map(([price]) => parseFloat(price));
  }
} 