import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CandleData } from '@/types/crypto';
import { calculateRSI } from '@/utils/technicalAnalysis';

interface AlertSystemProps {
  chartData: CandleData[];
  symbol: string;
}

interface Alert {
  id: string;
  type: 'price' | 'volume' | 'pattern' | 'indicator';
  condition: 'above' | 'below';
  value: number;
  active: boolean;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ chartData, symbol }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState<Omit<Alert, 'id' | 'active'>>({
    type: 'price',
    condition: 'above',
    value: 0,
  });
  const lastUpdateTimeRef = useRef<number>(0);

  const notifyAlert = useCallback((alert: Alert, currentValue: number) => {
    const message = `${symbol} ${alert.type} ${alert.condition} ${alert.value}
    Current value: ${currentValue.toFixed(2)}`;
    
    toast.info(message, {
      position: "top-right",
      autoClose: 5000,
      closeOnClick: true,
      rtl: true
    });
    
    // Deactivate one-time alerts
    if (alert.type === 'pattern') {
      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, active: false } : a
      ));
    }
  }, [symbol, setAlerts]);

  useEffect(() => {
    if (!chartData.length) return;
    
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 10000) return;
    lastUpdateTimeRef.current = now;
    
    const lastCandle = chartData[chartData.length - 1];
    
    alerts.forEach(alert => {
      if (!alert.active) return;
      
      switch (alert.type) {
        case 'price':
          if (alert.condition === 'above' && lastCandle.close > alert.value) {
            notifyAlert(alert, lastCandle.close);
          } else if (alert.condition === 'below' && lastCandle.close < alert.value) {
            notifyAlert(alert, lastCandle.close);
          }
          break;
          
        case 'volume':
          if (alert.condition === 'above' && lastCandle.volume > alert.value) {
            notifyAlert(alert, lastCandle.volume);
          }
          break;
          
        case 'indicator':
          // RSI alerts
          const rsi = calculateRSI(chartData.slice(-14));
          if (alert.condition === 'above' && rsi > alert.value) {
            notifyAlert(alert, rsi);
          } else if (alert.condition === 'below' && rsi < alert.value) {
            notifyAlert(alert, rsi);
          }
          break;
      }
    });
  }, [chartData, alerts, symbol, notifyAlert]);

  const handleAddAlert = () => {
    const alert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      ...newAlert,
      active: true
    };
    
    setAlerts(prev => [...prev, alert]);
    setShowForm(false);
    setNewAlert({ type: 'price', condition: 'above', value: 0 });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <div className="bg-[#1E222D] rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-lg font-medium">התראות</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          התראה חדשה
        </button>
      </div>

      {showForm && (
        <div className="bg-[#2A2D35] p-4 rounded mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <select
              value={newAlert.type}
              onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value as 'price' | 'volume' | 'pattern' | 'indicator' }))}
              className="bg-[#1E222D] text-white p-2 rounded"
            >
              <option value="price">מחיר</option>
              <option value="volume">נפח מסחר</option>
              <option value="indicator">אינדיקטור</option>
              <option value="pattern">תבנית</option>
            </select>
            
            <select
              value={newAlert.condition}
              onChange={(e) => setNewAlert(prev => ({ ...prev, condition: e.target.value as 'above' | 'below' }))}
              className="bg-[#1E222D] text-white p-2 rounded"
            >
              <option value="above">מעל</option>
              <option value="below">מתחת</option>
            </select>
            
            <input
              type="number"
              value={newAlert.value}
              onChange={(e) => setNewAlert(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
              className="bg-[#1E222D] text-white p-2 rounded col-span-2"
              placeholder="ערך"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white"
            >
              ביטול
            </button>
            <button
              onClick={handleAddAlert}
              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
            >
              הוסף
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex justify-between items-center p-3 rounded ${
              alert.active ? 'bg-[#2A2D35]' : 'bg-[#1E222D] opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <BellIcon className={`w-5 h-5 ${alert.active ? 'text-blue-500' : 'text-gray-500'}`} />
              <span className="text-white">
                {alert.type} {alert.condition} {alert.value}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAlerts(prev => prev.map(a =>
                  a.id === alert.id ? { ...a, active: !a.active } : a
                ))}
                className={`text-sm ${alert.active ? 'text-green-500' : 'text-gray-500'}`}
              >
                {alert.active ? 'פעיל' : 'לא פעיל'}
              </button>
              <button
                onClick={() => handleDeleteAlert(alert.id)}
                className="text-red-500 hover:text-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 