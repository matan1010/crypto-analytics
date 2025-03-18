import React, { useState, useEffect, useRef } from 'react';
import { calculateRSI, calculateSMA, findSupportResistanceAndOrderBlocks, calculateBollingerBands, calculateATR, calculateVolatility } from '@/utils/technicalAnalysis';
import { CandleData } from '@/types/crypto';

interface AIAssistantProps {
  chartData: CandleData[];
  symbol: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface AnalysisResult {
  trend: string;
  strength: number;
  support: number;
  resistance: number;
  rsi: number;
  volatility: number;
  recommendation: string;
  keyLevels: number[];
  patterns: string[];
  sentiment: string;
}

// Environment variables
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const IS_DEMO_MODE = !OPENAI_API_KEY || OPENAI_API_KEY.includes('your-actual-api-key') || OPENAI_API_KEY === 'sk-your-actual-api-key-goes-here';

// Simple local responses for demo mode
const getDemoResponse = (query: string, symbol: string, technicalSummary: string): string => {
  // Extract some basic data from technical summary
  const lines = technicalSummary.split('\n');
  let price = 'לא ידוע';
  let trend = 'לא ידוע';
  let rsi = 'לא ידוע';
  let sma50 = 'לא ידוע';
  let sma200 = 'לא ידוע';
  let support = 'לא ידוע';
  let resistance = 'לא ידוע';
  let changePercent = 'לא ידוע';
  let volume = 'לא ידוע';
  
  lines.forEach(line => {
    if (line.includes('Current Price:')) {
      price = line.split('$')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('Trend:')) {
      trend = line.includes('Bullish') ? 'עולה' : 'יורדת';
    }
    if (line.includes('RSI')) {
      const match = line.match(/RSI \(14\): ([\d.]+)/);
      if (match && match[1]) {
        rsi = match[1];
      }
    }
    if (line.includes('SMA 50:')) {
      sma50 = line.split('$')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('SMA 200:')) {
      sma200 = line.split('$')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('Support Level:')) {
      support = line.split('$')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('Resistance Level:')) {
      resistance = line.split('$')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('24h Change:')) {
      changePercent = line.split(':')[1]?.trim() || 'לא ידוע';
    }
    if (line.includes('Volume:')) {
      volume = line.split(':')[1]?.trim() || 'לא ידוע';
    }
  });
  
  // בדיקה אם יש שאלה על מחיר או מידע על המטבע
  if (query.match(/מחיר|כמה עולה|שווה|מטבע|ערך/i)) {
    return `היי! המחיר הנוכחי של ${symbol} הוא $${price} עם שינוי של ${changePercent} ב-24 שעות האחרונות. 
נפח המסחר עומד על ${volume}.

נתונים אלה מתעדכנים בזמן אמת מהגרף שאתה רואה.`;
  }
  
  // בדיקה אם יש שאלה על מגמה
  if (query.match(/מגמה|טרנד|כיוון|trend/i)) {
    const strengthWord = Number(rsi) > 65 ? "חזקה מאוד" : Number(rsi) > 55 ? "חזקה" : Number(rsi) > 45 ? "מתונה" : "חלשה";
    
    return `המגמה הנוכחית של ${symbol} היא ${trend} ו${strengthWord}. 
    
• מחיר נוכחי: $${price}
• RSI נוכחי: ${rsi}
• ממוצע נע 50: $${sma50}
• ממוצע נע 200: $${sma200}
• שינוי ב-24 שעות: ${changePercent}

הנתונים מתעדכנים בזמן אמת מהגרף. אני יכול לנתח לעומק - מה עוד תרצה לדעת?`;
  }
  
  // בדיקה אם יש שאלה על רמות תמיכה והתנגדות
  if (query.match(/תמיכה|התנגדות|רמות|support|resistance|levels/i)) {
    return `הנה רמות המפתח העדכניות של ${symbol}:

• מחיר נוכחי: $${price}
• רמת התנגדות: $${resistance}
• רמת תמיכה: $${support}
• טווח תנודות: ${Number(resistance) - Number(support)}$

כרגע, המחיר ${Number(price) > Number(resistance) ? "פרץ את רמת ההתנגדות! זה סימן חיובי" : Number(price) < Number(support) ? "נמצא מתחת לרמת התמיכה, מה שעלול להעיד על המשך ירידות" : "נע בטווח בין רמת התמיכה להתנגדות"}. 

הרמות מחושבות אוטומטית מהנתונים שבגרף - האם תרצה לדעת עוד פרטים?`;
  }
  
  // בדיקה אם יש שאלה על המלצות מסחר
  if (query.match(/המלצה|לקנות|למכור|trade|עסקה|כדאי|מה לעשות|לסחור/i)) {
    const rsiNum = Number(rsi);
    let actionAdvice = '';
    
    if (trend === 'עולה' && rsiNum < 70) {
      actionAdvice = `שקול כניסה לפוזיציית קנייה בטווח של $${Number(support).toFixed(2)} עד $${Number(price).toFixed(2)}`;
    } else if (trend === 'עולה' && rsiNum >= 70) {
      actionAdvice = `המטבע נמצא ברמות גבוהות יחסית, שקול לחכות לתיקון לפני כניסה או לבצע קניות קטנות בהדרגה`;
    } else if (trend === 'יורדת' && rsiNum > 30) {
      actionAdvice = `המגמה שלילית כרגע, שקול חכייה לסימני היפוך או הגעה לרמת תמיכה ב-$${Number(support).toFixed(2)}`;
    } else if (trend === 'יורדת' && rsiNum <= 30) {
      actionAdvice = `המטבע נמצא ברמות נמוכות יחסית, יתכן שזו הזדמנות לבחון כניסה הדרגתית לטווח ארוך`;
    }
    
    return `ניתוח מצב שוק עדכני עבור ${symbol}:

• מחיר נוכחי: $${price} (${changePercent})
• מגמה: ${trend}
• RSI: ${rsi} (${rsiNum > 70 ? "קנוי יתר" : rsiNum < 30 ? "מכור יתר" : "רמה נייטרלית"})
• רמת תמיכה קרובה: $${support}
• רמת התנגדות קרובה: $${resistance}

🔍 המלצות לבדיקה: ${actionAdvice}.

חשוב! זה ניתוח טכני בלבד המבוסס על מידע מהגרף, ולא המלצת השקעה. כל החלטת מסחר היא על אחריותך.`;
  }
  
  // בדיקה אם יש שאלה על ה-RSI
  if (query.match(/rsi|רסי|רס"י/i)) {
    const rsiNum = Number(rsi);
    return `ניתוח RSI עדכני עבור ${symbol}:

• ערך RSI נוכחי: ${rsi} (${rsiNum > 70 ? "קנוי יתר 📈" : rsiNum < 30 ? "מכור יתר 📉" : "טווח נייטרלי ↔️"})
• מחיר: $${price}
• מגמה: ${trend}

${rsiNum > 80 ? "ה-RSI בערכים גבוהים מאוד! יש לשים לב לאפשרות של תיקון במחיר בטווח הקרוב" : 
  rsiNum > 70 ? "ה-RSI מראה על קנייה מוגזמת. אפשרות לתיקון" : 
  rsiNum < 20 ? "ה-RSI בערכים נמוכים מאוד! יתכן שיש הזדמנות כניסה, אך ודא המשך מגמה" : 
  rsiNum < 30 ? "ה-RSI מראה על מכירה מוגזמת. יתכן שהמחיר יתחיל להתאושש" : 
  "ה-RSI בטווח נייטרלי, אין אינדיקציה חזקה לקנייה או מכירה לפי מדד זה"}

הנתונים מתעדכנים בזמן אמת מהגרף. רוצה שאסביר עוד על המשמעות של ה-RSI?`;
  }
  
  // בדיקה אם יש שאלה כללית או ברכת שלום
  if (query.match(/שלום|היי|בוקר טוב|ערב טוב|hello|hi|hey/i)) {
    return `שלום! אני העוזר האישי שלך לניתוח מטבעות קריפטו. 

המידע העדכני עבור ${symbol}:
• מחיר נוכחי: $${price} (${changePercent} ב-24 שעות)
• מגמה: ${trend}
• RSI: ${rsi}
• תמיכה/התנגדות: $${support} / $${resistance}

אני יכול לספק ניתוח על:
✅ מגמות ומחירים
✅ רמות תמיכה והתנגדות
✅ מדדי RSI וממוצעים נעים
✅ המלצות לבדיקה

מה תרצה לדעת על ${symbol}? הנתונים מתעדכנים בזמן אמת מהגרף.`;
  }
  
  // תשובה ברירת מחדל
  return `הנה ניתוח עדכני עבור ${symbol}:

📊 סקירה טכנית:
• מחיר נוכחי: $${price}
• שינוי ב-24 שעות: ${changePercent}
• מגמה: ${trend}
• RSI: ${rsi} (${Number(rsi) > 70 ? "קנוי יתר" : Number(rsi) < 30 ? "מכור יתר" : "נייטרלי"})
• תמיכה קרובה: $${support}
• התנגדות קרובה: $${resistance}
• נפח מסחר: ${volume}

הניתוח מבוסס על נתונים בזמן אמת מהגרף. איזה מידע נוסף אתה מחפש?`;
};

const AIAssistant: React.FC<AIAssistantProps> = ({ chartData, symbol }) => {
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis'>('analysis');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isClient, setIsClient] = useState(false);
  const messageIdCounter = useRef(0);
  const lastUpdateTimeRef = useRef<number>(0);
  
  const prepareTechnicalSummary = () => {
    if (!chartData || chartData.length === 0) {
      return "No data available for analysis";
    }

    const lastCandle = chartData[chartData.length - 1];
    const prevCandle = chartData[chartData.length - 2];
    const changePercent = ((lastCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2);
    
    // Calculate technical indicators
    const rsi = calculateRSI(chartData.slice(-14));
    const sma50 = calculateSMA(chartData.slice(-50), 50);
    const sma200 = calculateSMA(chartData.slice(-200), 200);
    const { support, resistance } = findSupportResistanceAndOrderBlocks(chartData.slice(-100));
    const volatility = calculateVolatility(chartData.slice(-20));
    const volume = lastCandle.volume.toLocaleString();
    
    // Determine trend
    let trend = "Neutral";
    if (lastCandle.close > sma50 && sma50 > sma200) {
      trend = "Bullish";
    } else if (lastCandle.close < sma50 && sma50 < sma200) {
      trend = "Bearish";
    }

    return `Technical Analysis Summary for ${symbol}:
Current Price: $${lastCandle.close.toFixed(2)}
24h Change: ${changePercent}%
Volume: ${volume}
Trend: ${trend}
RSI (14): ${rsi.toFixed(2)}
SMA 50: $${sma50.toFixed(2)}
SMA 200: $${sma200.toFixed(2)}
Support Level: $${support.toFixed(2)}
Resistance Level: $${resistance.toFixed(2)}
Volatility: ${volatility.toFixed(2)}%`;
  };
  
  const performTechnicalAnalysis = async () => {
    if (!chartData.length) return;

    const lastCandle = chartData[chartData.length - 1];
    const rsi = calculateRSI(chartData.slice(-14));
    const { support, resistance } = findSupportResistanceAndOrderBlocks(chartData);
    const volatility = calculateVolatility(chartData.slice(-20));
    const bollingerBands = calculateBollingerBands(chartData.slice(-20));
    const atr = calculateATR(chartData.slice(-14));

    // Determine trend strength based on multiple factors
    const sma20 = calculateSMA(chartData.slice(-20), 20);
    const sma50 = calculateSMA(chartData.slice(-50), 50);
    const sma200 = calculateSMA(chartData.slice(-200), 200);
    
    const trendStrength = calculateTrendStrength(lastCandle.close, sma20, sma50, sma200);
    const patterns = identifyPatterns(chartData.slice(-10));
    
    // Market sentiment analysis
    const sentiment = await analyzeMarketSentiment(symbol);

    setAnalysis({
      trend: determineTrend(chartData),
      strength: trendStrength,
      support,
      resistance,
      rsi,
      volatility,
      recommendation: generateRecommendation(rsi, trendStrength, volatility, patterns),
      keyLevels: [support, resistance, bollingerBands.lower, bollingerBands.upper],
      patterns,
      sentiment
    });
  };

  const determineTrend = (data: CandleData[]): string => {
    const sma20 = calculateSMA(data.slice(-20), 20);
    const sma50 = calculateSMA(data.slice(-50), 50);
    const sma200 = calculateSMA(data.slice(-200), 200);
    
    if (sma20 > sma50 && sma50 > sma200) return 'Strong Uptrend';
    if (sma20 < sma50 && sma50 < sma200) return 'Strong Downtrend';
    if (sma20 > sma50 && sma50 < sma200) return 'Potential Reversal Up';
    if (sma20 < sma50 && sma50 > sma200) return 'Potential Reversal Down';
    return 'Sideways';
  };

  const calculateTrendStrength = (currentPrice: number, sma20: number, sma50: number, sma200: number): number => {
    let strength = 0;
    
    // Distance from moving averages
    strength += (currentPrice - sma200) / sma200 * 100;
    strength += (currentPrice - sma50) / sma50 * 50;
    strength += (currentPrice - sma20) / sma20 * 25;
    
    // Normalize to 0-100
    return Math.max(0, Math.min(100, (strength + 100) / 2));
  };

  const identifyPatterns = (data: CandleData[]): string[] => {
    const patterns: string[] = [];
    
    // Add pattern recognition logic here
    // Example: Doji, Hammer, Engulfing, etc.
    
    return patterns;
  };

  const generateRecommendation = (
    _rsi: number,
    _trendStrength: number,
    _volatility: number,
    _patterns: string[]
  ): string => {
    // פשוט להדגמה - בפרויקט אמיתי היינו משתמשים בפרמטרים
    const recommendation = 'Hold';
    return recommendation;
  };

  const analyzeMarketSentiment = async (_symbol: string): Promise<string> => {
    try {
      // Add sentiment analysis from social media, news, etc.
      return 'Neutral';
    } catch (error) {
      console.error('Error analyzing market sentiment:', error);
      return 'Unknown';
    }
  };

  useEffect(() => {
    if (chartData.length > 0) {
      // הפחתת תדירות העדכונים - רק כל 15 שניות
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 15000) return;
      lastUpdateTimeRef.current = now;
      
      performTechnicalAnalysis();
    }
  }, [chartData, performTechnicalAnalysis]);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize with system message
    if (chatHistory.length === 0) {
      messageIdCounter.current += 1;
      const systemMessage: Message = {
        id: `msg-system-${messageIdCounter.current}`,
        role: 'system',
        content: `אתה מומחה מוביל לניתוח שווקי קריפטו המתמקד ב-${symbol}.
אתה מנתח אינדיקטורים טכניים ומספק תובנות מעמיקות על מגמות שוק, רמות תמיכה/התנגדות, ואפשרויות מסחר פוטנציאליות.
הגב תמיד בעברית, בסגנון מקצועי אך ידידותי, עם חום ואנושיות.
חשוב מאוד - אל תאמר אף פעם שאין לך גישה לנתונים עדכניים, כי כל הנתונים העדכניים מסופקים לך ישירות מהגרף בזמן אמת.
השתמש באימוג&apos;ים בתשובות שלך להדגשת נקודות חשובות ולהפיכת התשובות לקלות יותר להבנה.
ספק תשובות שלמות ומעמיקות אך ממוקדות, תוך שימוש במונחים טכניים נכונים אך בצורה מובנת, והסבר תמיד את הסיבה מאחורי ההמלצות שלך.
הצג את הנתונים בצורה מאורגנת עם כותרות וסעיפים ברורים.
כשאתה מספק תחזית או אנליזה, ציין מה רמת הוודאות וההסתברות, והסבר אילו גורמים עשויים לשנות את התחזית.
אתה דמות מסחר מקצועית עם ביטחון עצמי.
כשיש שאלות מעקב, התייחס להקשר ולהיסטוריית השיחה.
מטרתך העליונה היא לספק ערך אמיתי למשתמש באמצעות ניתוחים שימושיים שניתן ליישם.`,
        timestamp: Date.now()
      };
      
      setChatHistory([systemMessage]);
    }
  }, [chatHistory.length, symbol]);
  
  // Scroll to bottom when chat updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  // Function to call OpenAI GPT-4 Turbo API
  const callGPT4TurboAPI = async (messages: Array<{role: string, content: string}>) => {
    try {
      if (IS_DEMO_MODE) {
        throw new Error('Demo mode active - API key not configured');
      }
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // החלפה למודל המתקדם ביום
          messages: messages,
          temperature: 0.9, // הגדלת היצירתיות עוד יותר
          max_tokens: 1500, // הגדלת אורך התשובה המקסימלי
          presence_penalty: 0.4, // הגדלת העונש על חזרה על תוכן
          frequency_penalty: 0.5, // הגדלת העונש על שימוש חוזר באותן מילים
          response_format: { type: "text" }, // פורמט טקסט רגיל
          top_p: 0.95, // שימור מגוון תוך הסרת אפשרויות נדירות מדי
          seed: Math.floor(Math.random() * 1000000) // סיד אקראי לגיוון התשובות
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) {
      return;
    }
    
    // Create user message
    messageIdCounter.current += 1;
    const userMessage: Message = {
      id: `msg-user-${messageIdCounter.current}`,
      role: 'user',
      content: message.trim(),
      timestamp: Date.now()
    };
    
    // Add to chat history
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setMessage('');
    
    try {
      let aiResponse = '';
      const technicalSummary = prepareTechnicalSummary();
      
      // Check if in demo mode
      if (IS_DEMO_MODE) {
        // Use local response generation
        console.log('Using demo mode with local responses (no API key configured)');
        aiResponse = getDemoResponse(userMessage.content, symbol, technicalSummary);
      } else {
        // Prepare messages for the API
        const apiMessages = chatHistory
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        
        // Add the new user message with technical context
        apiMessages.push({
          role: 'user',
          content: `${message.trim()}\n\n[Technical Analysis Context (not visible to user)]:\n${technicalSummary}`
        });
        
        // Add the system message at the beginning
        const systemMessage = chatHistory.find(msg => msg.role === 'system');
        
        if (systemMessage) {
          apiMessages.unshift({
            role: 'system',
            content: systemMessage.content
          });
        }
        
        // Call the GPT-4 Turbo API
        aiResponse = await callGPT4TurboAPI(apiMessages);
      }
      
      // Add assistant response
      messageIdCounter.current += 1;
      const assistantMessage: Message = {
        id: `msg-assistant-${messageIdCounter.current}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Add error message
      messageIdCounter.current += 1;
      const errorMessage: Message = {
        id: `msg-error-${messageIdCounter.current}`,
        role: 'assistant',
        content: IS_DEMO_MODE
          ? 'אין מפתח API תקף של OpenAI. עדכן את קובץ .env.local עם מפתח API אמיתי. בינתיים, המערכת תפעל במצב דמו עם תשובות מוגבלות.'
          : 'אירעה שגיאה בעיבוד הבקשה. אנא נסה שוב מאוחר יותר.',
        timestamp: Date.now()
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-[#1E222D] rounded-lg shadow-lg p-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded ${
            activeTab === 'analysis' ? 'bg-[#2A2D35] text-white' : 'text-gray-400'
          }`}
        >
          ניתוח טכני
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded ${
            activeTab === 'chat' ? 'bg-[#2A2D35] text-white' : 'text-gray-400'
          }`}
        >
          צ'אט AI
        </button>
      </div>

      {activeTab === 'analysis' && analysis && (
        <div className="space-y-4 rtl">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2A2D35] p-3 rounded">
              <h3 className="text-sm font-medium text-gray-400 mb-1">מגמה</h3>
              <p className="text-white">{analysis.trend}</p>
            </div>
            <div className="bg-[#2A2D35] p-3 rounded">
              <h3 className="text-sm font-medium text-gray-400 mb-1">עוצמת מגמה</h3>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${analysis.strength}%` }}
                />
              </div>
            </div>
            <div className="bg-[#2A2D35] p-3 rounded">
              <h3 className="text-sm font-medium text-gray-400 mb-1">RSI</h3>
              <p className={`${
                analysis.rsi > 70 ? 'text-red-500' :
                analysis.rsi < 30 ? 'text-green-500' : 'text-white'
              }`}>
                {analysis.rsi.toFixed(2)}
              </p>
            </div>
            <div className="bg-[#2A2D35] p-3 rounded">
              <h3 className="text-sm font-medium text-gray-400 mb-1">תנודתיות</h3>
              <p className="text-white">{analysis.volatility.toFixed(2)}%</p>
            </div>
          </div>

          <div className="bg-[#2A2D35] p-3 rounded">
            <h3 className="text-sm font-medium text-gray-400 mb-2">רמות מפתח</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">התנגדות</span>
                <span className="text-white">${analysis.resistance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">תמיכה</span>
                <span className="text-white">${analysis.support.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {analysis.patterns.length > 0 && (
            <div className="bg-[#2A2D35] p-3 rounded">
              <h3 className="text-sm font-medium text-gray-400 mb-2">תבניות מסחר</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.patterns.map((pattern, index) => (
                  <span key={index} className="bg-[#363A45] px-2 py-1 rounded text-sm">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#2A2D35] p-3 rounded">
            <h3 className="text-sm font-medium text-gray-400 mb-2">סנטימנט שוק</h3>
            <p className="text-white">{analysis.sentiment}</p>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="h-[300px] overflow-y-auto bg-[#2A2D35] p-4 rounded">
            {!isClient ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-400 text-sm">טוען...</p>
              </div>
            ) : chatHistory.filter(msg => msg.role !== 'system').length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-center">
                <p className="text-gray-400 text-sm rtl">שאל שאלה על {symbol} להתחלת השיחה</p>
                <p className="text-gray-500 text-xs mt-2 rtl">
                  לדוגמה: "מה המגמה כרגע?", "מה המחיר?", "רמות תמיכה והתנגדות?", "המלצות?"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatHistory
                  .filter(msg => msg.role !== 'system')
                  .map(msg => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded-lg whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-[#2A303C] text-white rtl text-right'
                          : 'bg-[#2D364A] text-white rtl'
                      }`}
                    >
                      <div className="text-sm text-gray-300 mb-1">
                        {msg.role === 'user' ? 'אתה' : 'עוזר AI'}
                      </div>
                      <div 
                        className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-200'}`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="שאל שאלה על הניתוח הטכני..."
              className="flex-1 bg-[#2A2D35] text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 rtl"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className={`px-4 py-2 rounded ${
                isLoading || !message.trim()
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isLoading ? 'שולח...' : 'שלח'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistant; 